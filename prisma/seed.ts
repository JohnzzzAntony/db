import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { RequirementGroup, SubjectCategory } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Everything below is a starting point for administrators, NOT verified academic data.
// Subjects follow the Indian Nursing Council two-year Post Basic B.Sc. Nursing scheme;
// marks, codes and units are deliberately left empty until confirmed from the university syllabus.
const UNVERIFIED_NOTE =
  "Seeded default — confirm affiliation, regulation year and subject list against the current university syllabus before marking verified.";

const SUBJECTS: Record<number, [string, SubjectCategory][]> = {
  1: [
    ["Nursing Foundation", "NURSING_FOUNDATION_EDUCATION"],
    ["Nutrition and Dietetics", "BASIC_SCIENCES"],
    ["Biochemistry and Biophysics", "BASIC_SCIENCES"],
    ["Psychology", "BEHAVIOURAL_SCIENCES"],
    ["Microbiology", "BASIC_SCIENCES"],
    ["Maternal Nursing", "MATERNAL_MIDWIFERY"],
    ["Child Health Nursing", "CHILD_HEALTH"],
    ["Medical-Surgical Nursing", "MEDICAL_SURGICAL"],
    ["English", "OTHER"],
  ],
  2: [
    ["Sociology", "BEHAVIOURAL_SCIENCES"],
    ["Community Health Nursing", "COMMUNITY_HEALTH"],
    ["Mental Health Nursing", "MENTAL_HEALTH"],
    ["Introduction to Nursing Education", "NURSING_FOUNDATION_EDUCATION"],
    ["Introduction to Nursing Administration", "NURSING_ADMINISTRATION"],
    ["Introduction to Nursing Research and Statistics", "NURSING_RESEARCH_STATISTICS"],
  ],
};

// Transcribed from the Koshys College of Nursing clinical requirement sheet supplied by the user.
const REQ_SOURCE = "Koshys College of Nursing clinical requirement sheet";
const REQUIREMENTS: [SubjectCategory, RequirementGroup, string, number, string | null][] = [
  ["MEDICAL_SURGICAL", "CARE_PLAN", "Medical Care Plans", 2, null],
  ["MEDICAL_SURGICAL", "CARE_PLAN", "Surgical Care Plans", 2, null],
  ["MEDICAL_SURGICAL", "CASE_STUDY", "Case Study (Medical or Surgical)", 1, null],
  ["MEDICAL_SURGICAL", "CASE_PRESENTATION", "Case Presentation", 1, null],
  ["MEDICAL_SURGICAL", "HEALTH_EDUCATION", "Health Education with Flash Card", 1, null],
  ["MEDICAL_SURGICAL", "DRUG_PRESENTATION", "Drug Presentation (5 drugs, any category)", 1, null],
  ["MEDICAL_SURGICAL", "PROCEDURE", "Assisting in Major Surgeries", 3, "surgeries"],
  ["MEDICAL_SURGICAL", "PROCEDURE", "Assisting in Minor Surgeries", 3, "surgeries"],
  ["CHILD_HEALTH", "CARE_PLAN", "Normal Newborn Care Plan", 1, null],
  ["CHILD_HEALTH", "CARE_PLAN", "High-Risk Newborn Care Plan", 1, null],
  ["CHILD_HEALTH", "CARE_PLAN", "Pediatric Medicine Care Plan", 1, null],
  ["CHILD_HEALTH", "CARE_PLAN", "Pediatric Surgery Care Plan", 1, null],
  ["CHILD_HEALTH", "CASE_STUDY", "Pediatric Case Study", 1, null],
  ["CHILD_HEALTH", "CASE_PRESENTATION", "Pediatric Case Presentation", 1, null],
  ["CHILD_HEALTH", "HEALTH_EDUCATION", "Health Education with Flash Card", 1, null],
  ["CHILD_HEALTH", "ASSESSMENT", "Growth and Development Assessment", 1, null],
  ["CHILD_HEALTH", "ASSIGNMENT", "Assignment: Play Therapy", 1, null],
  ["CHILD_HEALTH", "ASSIGNMENT", "Assignment: Vaccines in Children", 1, null],
  ["CHILD_HEALTH", "ASSIGNMENT", "Assignment: Care of Child in Incubator and Phototherapy", 1, null],
  ["MATERNAL_MIDWIFERY", "CLINICAL_FILE", "Antenatal Case Study", 1, null],
  ["MATERNAL_MIDWIFERY", "CLINICAL_FILE", "Postnatal Case Study", 1, null],
  ["MATERNAL_MIDWIFERY", "CLINICAL_FILE", "Neonatal Case Study", 1, null],
  ["MATERNAL_MIDWIFERY", "HEALTH_EDUCATION", "Health Education: Antenatal", 1, null],
  ["MATERNAL_MIDWIFERY", "HEALTH_EDUCATION", "Health Education: Postnatal", 1, null],
  ["MATERNAL_MIDWIFERY", "ASSIGNMENT", "Assignment: Family Planning Methods", 1, null],
];

async function main() {
  const university = await db.university.upsert({
    where: { name: "Rajiv Gandhi University of Health Sciences" },
    update: {},
    create: {
      name: "Rajiv Gandhi University of Health Sciences",
      shortName: "RGUHS",
      state: "Karnataka",
      website: "https://www.rguhs.ac.in",
      verificationStatus: "UNVERIFIED",
      notes: UNVERIFIED_NOTE,
    },
  });

  const regulation = await db.regulation.upsert({
    where: { universityId_name: { universityId: university.id, name: "Post Basic B.Sc. Nursing (2-year)" } },
    update: {},
    create: {
      universityId: university.id,
      course: "Post Basic B.Sc. Nursing",
      name: "Post Basic B.Sc. Nursing (2-year)",
      courseDurationYears: 2,
      examStructure: "YEARLY",
      verificationStatus: "UNVERIFIED",
      notes: UNVERIFIED_NOTE,
    },
  });

  for (const number of [1, 2]) {
    const year = await db.academicYear.upsert({
      where: { regulationId_number: { regulationId: regulation.id, number } },
      update: {},
      create: { regulationId: regulation.id, number, label: number === 1 ? "First Year" : "Second Year" },
    });
    for (const [i, [name, category]] of SUBJECTS[number].entries()) {
      await db.subject.upsert({
        where: { academicYearId_name: { academicYearId: year.id, name } },
        update: {},
        create: { academicYearId: year.id, name, category, sortOrder: i, verificationStatus: "UNVERIFIED" },
      });
    }
  }

  const institution = await db.institution.upsert({
    where: { name: "Koshys College of Nursing" },
    update: {},
    create: {
      name: "Koshys College of Nursing",
      city: "Bangalore",
      state: "Karnataka",
      universityId: university.id,
      regulationId: regulation.id,
      affiliationNote: "Affiliation to RGUHS pre-filled as a default and not yet confirmed by the college.",
    },
  });

  if ((await db.clinicalRequirement.count({ where: { institutionId: institution.id } })) === 0) {
    await db.clinicalRequirement.createMany({
      data: REQUIREMENTS.map(([subjectCategory, group, title, quantity, quantityUnit], sortOrder) => ({
        institutionId: institution.id,
        regulationId: regulation.id,
        subjectCategory,
        group,
        title,
        quantity,
        quantityUnit,
        source: REQ_SOURCE,
        sortOrder,
      })),
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    await db.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: {
        email,
        name: "Administrator",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
        institutionId: institution.id,
        regulationId: regulation.id,
      },
    });
    console.log(`Admin ready: ${email}`);
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin created.");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
