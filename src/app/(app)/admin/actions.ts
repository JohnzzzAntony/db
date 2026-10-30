"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole, hasRole } from "@/lib/auth/dal";
import { formAction, optionalInt, optionalNumber, optionalUrl, UserFacingError } from "@/lib/actions";
import { chunkPages } from "@/lib/library/chunk";
import { extractPages, UnreadableFileError } from "@/lib/library/extract-text";
import { env } from "@/lib/env";

const status = z.enum(["VERIFIED", "UNVERIFIED", "REJECTED"]).default("UNVERIFIED");
const text = (max: number) => z.string().trim().max(max).optional();
const required = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max);
const done = (path: string, message = "Saved.") => {
  revalidatePath(path);
  return { ok: true, message };
};

// ─── Universities & regulations (ADMIN) ─────────────────────────────────────

const universitySchema = z.object({
  id: z.string().optional(),
  name: required("Name"),
  shortName: text(40),
  state: text(80),
  website: optionalUrl,
  verificationStatus: status,
  notes: text(2000),
});

export const saveUniversity = formAction("ADMIN", universitySchema, async ({ id, ...data }) => {
  const clean = { ...data, shortName: data.shortName ?? null, state: data.state ?? null, website: data.website ?? null, notes: data.notes ?? null };
  if (id) await db.university.update({ where: { id }, data: clean });
  else await db.university.create({ data: clean });
  return done("/admin/universities", id ? "University updated." : "University added.");
});

const regulationSchema = z.object({
  id: z.string().optional(),
  universityId: z.string().min(1),
  course: required("Course"),
  name: required("Name"),
  syllabusYear: text(40),
  courseDurationYears: z.coerce.number().int().min(1).max(6),
  examStructure: z.enum(["YEARLY", "SEMESTER"]),
  sourceUrl: optionalUrl,
  verificationStatus: status,
  notes: text(2000),
});

export const saveRegulation = formAction("ADMIN", regulationSchema, async ({ id, ...data }) => {
  const clean = { ...data, syllabusYear: data.syllabusYear ?? null, sourceUrl: data.sourceUrl ?? null, notes: data.notes ?? null };
  if (id) {
    await db.regulation.update({ where: { id }, data: clean });
    return done(`/admin/regulations/${id}`, "Regulation updated.");
  }
  const created = await db.regulation.create({ data: clean });
  // Pre-create the year/semester shells so subjects can be added straight away.
  const isSem = data.examStructure === "SEMESTER";
  const count = isSem ? data.courseDurationYears * 2 : data.courseDurationYears;
  const ordinal = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth"];
  await db.academicYear.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      regulationId: created.id,
      number: i + 1,
      label: `${ordinal[i]} ${isSem ? "Semester" : "Year"}`,
    })),
  });
  return done("/admin/universities", "Regulation added.");
});

export const saveAcademicYear = formAction(
  "ADMIN",
  z.object({ id: z.string().min(1), label: required("Label", 60) }),
  async ({ id, label }) => {
    const y = await db.academicYear.update({ where: { id }, data: { label } });
    return done(`/admin/regulations/${y.regulationId}`);
  },
);

// ─── Subjects (ADMIN creates; FACULTY edits content) ───────────────────────

const SUBJECT_CATEGORIES = [
  "NURSING_FOUNDATION_EDUCATION", "MEDICAL_SURGICAL", "CHILD_HEALTH", "MATERNAL_MIDWIFERY", "COMMUNITY_HEALTH",
  "MENTAL_HEALTH", "NURSING_ADMINISTRATION", "NURSING_RESEARCH_STATISTICS", "BASIC_SCIENCES", "BEHAVIOURAL_SCIENCES", "OTHER",
] as const;

export const createSubject = formAction(
  "ADMIN",
  z.object({ academicYearId: z.string().min(1), name: required("Name"), code: text(40), category: z.enum(SUBJECT_CATEGORIES) }),
  async ({ academicYearId, name, code, category }) => {
    const year = await db.academicYear.findUniqueOrThrow({ where: { id: academicYearId } });
    const sortOrder = await db.subject.count({ where: { academicYearId } });
    await db.subject.create({ data: { academicYearId, name, code: code ?? null, category, sortOrder } });
    return done(`/admin/regulations/${year.regulationId}`, "Subject added.");
  },
);

export const saveSubject = formAction(
  "FACULTY",
  z.object({
    id: z.string().min(1),
    name: required("Name"),
    code: text(40),
    category: z.enum(SUBJECT_CATEGORIES),
    overview: text(5000),
    theoryMarks: optionalInt,
    theoryInternal: optionalInt,
    practicalMarks: optionalInt,
    practicalInternal: optionalInt,
    theoryHours: optionalInt,
    practicalHours: optionalInt,
    examDurationHours: optionalNumber,
    verificationStatus: status,
    sortOrder: z.coerce.number().int().default(0),
  }),
  async ({ id, ...d }, user) => {
    // Faculty may edit teaching content; only admins can change what counts as verified syllabus.
    const current = await db.subject.findUniqueOrThrow({ where: { id } });
    const verificationStatus = hasRole(user, "ADMIN") ? d.verificationStatus : current.verificationStatus;
    const n = <T,>(v: T | undefined) => v ?? null;
    await db.subject.update({
      where: { id },
      data: {
        name: d.name, code: n(d.code), category: d.category, overview: n(d.overview),
        theoryMarks: n(d.theoryMarks), theoryInternal: n(d.theoryInternal), practicalMarks: n(d.practicalMarks),
        practicalInternal: n(d.practicalInternal), theoryHours: n(d.theoryHours), practicalHours: n(d.practicalHours),
        examDurationHours: n(d.examDurationHours), verificationStatus, sortOrder: d.sortOrder,
      },
    });
    return done(`/admin/subjects/${id}`, "Subject saved.");
  },
);

export async function deleteSubject(id: string) {
  await assertRole("ADMIN");
  const s = await db.subject.delete({ where: { id }, include: { academicYear: true } });
  revalidatePath(`/admin/regulations/${s.academicYear.regulationId}`);
}

const topicsFromText = (raw: string | undefined) =>
  (raw ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((title, sortOrder) => ({ title: title.slice(0, 200), sortOrder }));

export const saveUnit = formAction(
  "FACULTY",
  z.object({
    id: z.string().optional(),
    subjectId: z.string().min(1),
    number: z.coerce.number().int().min(1).max(50),
    title: required("Title"),
    hours: optionalInt,
    objectives: text(3000),
    topics: text(10000),
  }),
  async ({ id, subjectId, topics, ...d }) => {
    const data = { ...d, hours: d.hours ?? null, objectives: d.objectives ?? null };
    await db.$transaction(async (tx) => {
      const unit = id
        ? await tx.unit.update({ where: { id }, data })
        : await tx.unit.create({ data: { ...data, subjectId } });
      await tx.topic.deleteMany({ where: { unitId: unit.id } });
      await tx.topic.createMany({ data: topicsFromText(topics).map((t) => ({ ...t, unitId: unit.id })) });
    });
    return done(`/admin/subjects/${subjectId}`, id ? "Unit saved." : "Unit added.");
  },
);

export async function deleteUnit(id: string) {
  await assertRole("FACULTY");
  const u = await db.unit.delete({ where: { id } });
  revalidatePath(`/admin/subjects/${u.subjectId}`);
}

export const saveTextbook = formAction(
  "FACULTY",
  z.object({
    subjectId: z.string().min(1),
    title: required("Title", 300),
    authors: required("Authors", 300),
    edition: text(40),
    publisher: text(200),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    isbn: text(20),
  }),
  async (d) => {
    await db.textbook.create({
      data: { ...d, edition: d.edition ?? null, publisher: d.publisher ?? null, year: d.year ?? null, isbn: d.isbn ?? null },
    });
    return done(`/admin/subjects/${d.subjectId}`, "Textbook added.");
  },
);

export async function deleteTextbook(id: string) {
  await assertRole("FACULTY");
  const t = await db.textbook.delete({ where: { id } });
  revalidatePath(`/admin/subjects/${t.subjectId}`);
}

// ─── Institution & clinical requirements (ADMIN) ────────────────────────────

export const saveInstitution = formAction(
  "ADMIN",
  z.object({
    id: z.string().min(1),
    name: required("Name"),
    city: text(80),
    universityId: z.string().optional(),
    regulationId: z.string().optional(),
    affiliationNote: text(1000),
  }),
  async ({ id, ...d }) => {
    await db.institution.update({
      where: { id },
      data: { name: d.name, city: d.city ?? null, universityId: d.universityId ?? null, regulationId: d.regulationId ?? null, affiliationNote: d.affiliationNote ?? null },
    });
    return done("/admin/requirements", "Institution saved.");
  },
);

const REQ_GROUPS = ["CARE_PLAN", "CASE_STUDY", "CASE_PRESENTATION", "HEALTH_EDUCATION", "DRUG_PRESENTATION", "PROCEDURE", "ASSESSMENT", "ASSIGNMENT", "CLINICAL_FILE", "OTHER"] as const;

export const saveRequirement = formAction(
  "ADMIN",
  z.object({
    id: z.string().optional(),
    institutionId: z.string().min(1),
    subjectCategory: z.enum(SUBJECT_CATEGORIES),
    group: z.enum(REQ_GROUPS),
    title: required("Title"),
    quantity: z.coerce.number().int().min(1).max(100),
    quantityUnit: text(40),
    notes: text(1000),
    source: text(200),
  }),
  async ({ id, ...d }) => {
    const data = { ...d, quantityUnit: d.quantityUnit ?? null, notes: d.notes ?? null, source: d.source ?? null };
    if (id) await db.clinicalRequirement.update({ where: { id }, data });
    else await db.clinicalRequirement.create({ data: { ...data, sortOrder: await db.clinicalRequirement.count({ where: { institutionId: d.institutionId } }) } });
    return done("/admin/requirements", id ? "Requirement saved." : "Requirement added.");
  },
);

export async function deleteRequirement(id: string) {
  await assertRole("ADMIN");
  await db.clinicalRequirement.delete({ where: { id } });
  revalidatePath("/admin/requirements");
}

// ─── Reference library (FACULTY uploads, ADMIN verifies) ────────────────────

const SOURCE_KINDS = ["TEXTBOOK_EXCERPT", "CLINICAL_GUIDELINE", "GOVERNMENT_PROGRAMME", "JOURNAL_ARTICLE", "LECTURE_NOTES", "SYLLABUS", "OTHER"] as const;

export const uploadSource = formAction(
  "FACULTY",
  z.object({
    title: required("Title", 300),
    kind: z.enum(SOURCE_KINDS),
    authors: text(300),
    publisher: text(200),
    edition: text(40),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    url: optionalUrl,
    subjectId: z.string().optional(),
  }),
  async (d, user, form) => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Choose a file.");
    if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) throw new UserFacingError(`Files must be under ${env.MAX_UPLOAD_MB} MB.`);
    let pages: string[];
    let paginated: boolean;
    try {
      ({ pages, paginated } = await extractPages(file));
    } catch (e) {
      if (e instanceof UnreadableFileError) throw new UserFacingError(e.message);
      throw new UserFacingError("Could not read that file.");
    }
    const chunks = chunkPages(pages, paginated);
    if (!chunks.length) throw new UserFacingError("No readable text found in the file.");
    await db.sourceDocument.create({
      data: {
        title: d.title, kind: d.kind, authors: d.authors ?? null, publisher: d.publisher ?? null, edition: d.edition ?? null,
        year: d.year ?? null, url: d.url ?? null, subjectId: d.subjectId ?? null, uploadedById: user.id,
        // Admin uploads count as reviewed; faculty uploads wait for an admin.
        verificationStatus: hasRole(user, "ADMIN") ? "VERIFIED" : "UNVERIFIED",
        chunks: { createMany: { data: chunks } },
      },
    });
    return done("/admin/library", `Added ${chunks.length} passages to the library.`);
  },
);

export async function setSourceStatus(id: string, verificationStatus: "VERIFIED" | "UNVERIFIED" | "REJECTED") {
  await assertRole("ADMIN");
  await db.sourceDocument.update({ where: { id }, data: { verificationStatus } });
  revalidatePath("/admin/library");
}

export async function deleteSource(id: string) {
  await assertRole("ADMIN");
  await db.sourceDocument.delete({ where: { id } });
  revalidatePath("/admin/library");
}

// ─── Users (ADMIN) ──────────────────────────────────────────────────────────

export const setUserRole = formAction(
  "ADMIN",
  z.object({ userId: z.string().min(1), role: z.enum(["STUDENT", "FACULTY", "ADMIN"]) }),
  async ({ userId, role }, admin) => {
    if (userId === admin.id && role !== "ADMIN") throw new UserFacingError("You can't remove your own admin role.");
    await db.user.update({ where: { id: userId }, data: { role } });
    return done("/admin/users", "Role updated.");
  },
);
