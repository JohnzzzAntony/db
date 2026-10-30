import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextArea, TextField, VERIFICATION_OPTIONS } from "@/components/fields";
import { VerificationBadge } from "@/components/badges";
import { saveRegulation, saveUniversity } from "../actions";

export const metadata: Metadata = { title: "Universities & syllabus" };

type Uni = Awaited<ReturnType<typeof load>>[number] | null;

function load() {
  return db.university.findMany({
    orderBy: { name: "asc" },
    include: { regulations: { orderBy: { name: "asc" }, include: { _count: { select: { academicYears: true } } } } },
  });
}

function UniversityFields({ u }: { u: Uni }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {u ? <input type="hidden" name="id" value={u.id} /> : null}
      <TextField name="name" label="Name *" defaultValue={u?.name} required />
      <TextField name="shortName" label="Short name" defaultValue={u?.shortName ?? ""} />
      <TextField name="state" label="State" defaultValue={u?.state ?? ""} />
      <TextField name="website" label="Official website" type="url" defaultValue={u?.website ?? ""} />
      <SelectField name="verificationStatus" label="Verification" options={VERIFICATION_OPTIONS} defaultValue={u?.verificationStatus ?? "UNVERIFIED"} />
      <TextArea name="notes" label="Notes" defaultValue={u?.notes ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export default async function UniversitiesPage() {
  await requireRole("ADMIN");
  const universities = await load();
  return (
    <>
      <PageHeader title="Universities & syllabus regulations" description="Mark items verified only after checking the university's official syllabus or notification." />
      <div className="space-y-6">
        {universities.map((u) => (
          <section key={u.id} className="card" aria-labelledby={`u-${u.id}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 id={`u-${u.id}`} className="font-serif text-xl font-semibold">{u.name}</h2>
              <VerificationBadge status={u.verificationStatus} />
            </div>
            <h3 className="mb-2 text-sm font-semibold">Regulations</h3>
            <ul className="mb-4 space-y-1 text-sm">
              {u.regulations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/regulations/${r.id}`} className="link">{r.name}</Link>
                  <span className="text-muted">{r.course} · {r._count.academicYears} {r.examStructure === "SEMESTER" ? "semesters" : "years"}</span>
                  <VerificationBadge status={r.verificationStatus} />
                </li>
              ))}
              {!u.regulations.length ? <li className="text-muted">None yet.</li> : null}
            </ul>
            <details className="mb-3">
              <summary className="cursor-pointer text-sm text-brand">Add regulation</summary>
              <ActionForm action={saveRegulation} submitLabel="Add regulation" resetOnSuccess className="mt-3 space-y-3">
                <input type="hidden" name="universityId" value={u.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField name="course" label="Course *" defaultValue="Post Basic B.Sc. Nursing" required />
                  <TextField name="name" label="Regulation name *" placeholder="e.g. PB B.Sc. Nursing 2-year, 2008 regulation" required />
                  <TextField name="syllabusYear" label="Syllabus / regulation year" />
                  <TextField name="courseDurationYears" label="Duration (years) *" type="number" min={1} max={6} defaultValue={2} required />
                  <SelectField name="examStructure" label="Exam structure" options={[["YEARLY", "Yearly"], ["SEMESTER", "Semester"]]} />
                  <TextField name="sourceUrl" label="Syllabus source URL" type="url" />
                  <SelectField name="verificationStatus" label="Verification" options={VERIFICATION_OPTIONS} />
                  <TextArea name="notes" label="Notes" />
                </div>
              </ActionForm>
            </details>
            <details>
              <summary className="cursor-pointer text-sm text-brand">Edit university</summary>
              <ActionForm action={saveUniversity} className="mt-3 space-y-3">
                <UniversityFields u={u} />
              </ActionForm>
            </details>
          </section>
        ))}
        <section className="card" aria-labelledby="new-u">
          <h2 id="new-u" className="mb-3 font-semibold">Add university</h2>
          <ActionForm action={saveUniversity} submitLabel="Add university" resetOnSuccess>
            <UniversityFields u={null} />
          </ActionForm>
        </section>
      </div>
    </>
  );
}
