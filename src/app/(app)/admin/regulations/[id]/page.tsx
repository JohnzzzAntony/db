import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextArea, TextField, VERIFICATION_OPTIONS } from "@/components/fields";
import { VerificationBadge } from "@/components/badges";
import { SUBJECT_CATEGORY_LABELS } from "@/lib/labels";
import { createSubject, deleteSubject, saveAcademicYear, saveRegulation } from "../../actions";

export const metadata: Metadata = { title: "Regulation" };

const CATEGORY_OPTIONS = Object.entries(SUBJECT_CATEGORY_LABELS) as [string, string][];

export default async function RegulationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const r = await db.regulation.findUnique({
    where: { id: (await params).id },
    include: {
      university: true,
      academicYears: { orderBy: { number: "asc" }, include: { subjects: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } },
    },
  });
  if (!r) notFound();

  return (
    <>
      <PageHeader title={r.name} description={<>{r.university.name} · <VerificationBadge status={r.verificationStatus} /></>} />
      <details className="card mb-6">
        <summary className="cursor-pointer font-semibold">Edit regulation</summary>
        <ActionForm action={saveRegulation} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="universityId" value={r.universityId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="course" label="Course *" defaultValue={r.course} required />
            <TextField name="name" label="Name *" defaultValue={r.name} required />
            <TextField name="syllabusYear" label="Syllabus / regulation year" defaultValue={r.syllabusYear ?? ""} />
            <TextField name="courseDurationYears" label="Duration (years)" type="number" min={1} max={6} defaultValue={r.courseDurationYears} />
            <SelectField name="examStructure" label="Exam structure" options={[["YEARLY", "Yearly"], ["SEMESTER", "Semester"]]} defaultValue={r.examStructure} />
            <TextField name="sourceUrl" label="Syllabus source URL" type="url" defaultValue={r.sourceUrl ?? ""} />
            <SelectField name="verificationStatus" label="Verification" options={VERIFICATION_OPTIONS} defaultValue={r.verificationStatus} />
            <TextArea name="notes" label="Notes" defaultValue={r.notes ?? ""} />
          </div>
        </ActionForm>
      </details>

      <div className="space-y-6">
        {r.academicYears.map((y) => (
          <section key={y.id} className="card" aria-labelledby={`y-${y.id}`}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id={`y-${y.id}`} className="font-serif text-xl font-semibold">{y.label}</h2>
              <ActionForm action={saveAcademicYear} submitLabel="Rename" className="flex items-end gap-2" submitClassName="btn-secondary">
                <input type="hidden" name="id" value={y.id} />
                <TextField name="label" label="Label" defaultValue={y.label} required />
              </ActionForm>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Subject</th><th>Code</th><th>Category</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {y.subjects.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/admin/subjects/${s.id}`} className="link">{s.name}</Link></td>
                      <td>{s.code ?? "—"}</td>
                      <td>{SUBJECT_CATEGORY_LABELS[s.category]}</td>
                      <td><VerificationBadge status={s.verificationStatus} /></td>
                      <td className="text-right">
                        <form action={deleteSubject.bind(null, s.id)}>
                          <button className="btn-danger" aria-label={`Delete ${s.name}`}>Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ActionForm action={createSubject} submitLabel="Add subject" resetOnSuccess className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
              <input type="hidden" name="academicYearId" value={y.id} />
              <TextField name="name" label="New subject name" required />
              <TextField name="code" label="Code" />
              <SelectField name="category" label="Category" options={CATEGORY_OPTIONS} />
            </ActionForm>
          </section>
        ))}
      </div>
    </>
  );
}
