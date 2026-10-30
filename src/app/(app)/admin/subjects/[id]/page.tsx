import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextArea, TextField, VERIFICATION_OPTIONS } from "@/components/fields";
import { SUBJECT_CATEGORY_LABELS } from "@/lib/labels";
import { deleteTextbook, deleteUnit, saveSubject, saveTextbook, saveUnit } from "../../actions";

export const metadata: Metadata = { title: "Edit subject" };

const CATEGORY_OPTIONS = Object.entries(SUBJECT_CATEGORY_LABELS) as [string, string][];

export default async function EditSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("FACULTY");
  const s = await db.subject.findUnique({
    where: { id: (await params).id },
    include: {
      academicYear: { include: { regulation: true } },
      units: { orderBy: { number: "asc" }, include: { topics: { orderBy: { sortOrder: "asc" } } } },
      textbooks: { orderBy: { title: "asc" } },
    },
  });
  if (!s) notFound();
  const isAdmin = hasRole(user, "ADMIN");
  const num = (v: number | null) => (v == null ? "" : String(v));

  return (
    <>
      <PageHeader
        title={s.name}
        description={`${s.academicYear.regulation.name} · ${s.academicYear.label}`}
        actions={<Link href={`/subjects/${s.id}`} className="btn-secondary">View as student</Link>}
      />

      <section className="card mb-6" aria-labelledby="details">
        <h2 id="details" className="mb-3 font-semibold">Subject details &amp; examination scheme</h2>
        <ActionForm action={saveSubject}>
          <input type="hidden" name="id" value={s.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField name="name" label="Name *" defaultValue={s.name} required />
            <TextField name="code" label="Subject code" defaultValue={s.code ?? ""} />
            <SelectField name="category" label="Category" options={CATEGORY_OPTIONS} defaultValue={s.category} />
            <TextField name="theoryMarks" label="Theory marks" type="number" min={0} defaultValue={num(s.theoryMarks)} />
            <TextField name="theoryInternal" label="Theory internal" type="number" min={0} defaultValue={num(s.theoryInternal)} />
            <TextField name="practicalMarks" label="Practical marks" type="number" min={0} defaultValue={num(s.practicalMarks)} />
            <TextField name="practicalInternal" label="Practical internal" type="number" min={0} defaultValue={num(s.practicalInternal)} />
            <TextField name="theoryHours" label="Theory hours" type="number" min={0} defaultValue={num(s.theoryHours)} />
            <TextField name="practicalHours" label="Practical / clinical hours" type="number" min={0} defaultValue={num(s.practicalHours)} />
            <TextField name="examDurationHours" label="Exam duration (hours)" type="number" step="0.5" min={0} defaultValue={num(s.examDurationHours)} />
            <TextField name="sortOrder" label="Display order" type="number" defaultValue={s.sortOrder} />
            {isAdmin ? (
              <SelectField name="verificationStatus" label="Verification" options={VERIFICATION_OPTIONS} defaultValue={s.verificationStatus} />
            ) : (
              <input type="hidden" name="verificationStatus" value={s.verificationStatus} />
            )}
            <TextArea name="overview" label="Overview" rows={4} defaultValue={s.overview ?? ""} className="sm:col-span-3" />
          </div>
        </ActionForm>
      </section>

      <section className="card mb-6" aria-labelledby="units">
        <h2 id="units" className="mb-1 font-semibold">Units &amp; topics</h2>
        <p className="mb-4 text-xs text-muted">One topic per line. Topics become one-click study generator prompts for students.</p>
        <div className="space-y-4">
          {s.units.map((u) => (
            <details key={u.id} className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Unit {u.number}: {u.title} ({u.topics.length} topics)</summary>
              <ActionForm action={saveUnit} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="subjectId" value={s.id} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <TextField name="number" label="Number" type="number" min={1} defaultValue={u.number} required />
                  <TextField name="title" label="Title" defaultValue={u.title} required className="sm:col-span-2" />
                  <TextField name="hours" label="Hours" type="number" min={0} defaultValue={num(u.hours)} />
                  <TextArea name="objectives" label="Objectives" defaultValue={u.objectives ?? ""} className="sm:col-span-4" />
                  <TextArea name="topics" label="Topics" rows={6} defaultValue={u.topics.map((t) => t.title).join("\n")} className="sm:col-span-4" />
                </div>
              </ActionForm>
              <form action={deleteUnit.bind(null, u.id)} className="mt-2">
                <button className="btn-danger">Delete unit</button>
              </form>
            </details>
          ))}
        </div>
        <h3 className="mb-2 mt-6 text-sm font-semibold">Add unit</h3>
        <ActionForm action={saveUnit} submitLabel="Add unit" resetOnSuccess>
          <input type="hidden" name="subjectId" value={s.id} />
          <div className="grid gap-3 sm:grid-cols-4">
            <TextField name="number" label="Number" type="number" min={1} defaultValue={s.units.length + 1} required />
            <TextField name="title" label="Title" required className="sm:col-span-2" />
            <TextField name="hours" label="Hours" type="number" min={0} />
            <TextArea name="topics" label="Topics (one per line)" rows={4} className="sm:col-span-4" />
          </div>
        </ActionForm>
      </section>

      <section className="card" aria-labelledby="books">
        <h2 id="books" className="mb-1 font-semibold">Recommended textbooks</h2>
        <p className="mb-4 text-xs text-muted">The AI may name only these books (and verified library sources) as references.</p>
        <ul className="mb-4 space-y-2 text-sm">
          {s.textbooks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
              <span><span className="font-medium">{t.title}</span> — {t.authors}{t.edition ? `, ${t.edition} ed.` : ""}{t.publisher ? `, ${t.publisher}` : ""}{t.year ? ` (${t.year})` : ""}</span>
              <form action={deleteTextbook.bind(null, t.id)}><button className="btn-danger">Remove</button></form>
            </li>
          ))}
          {!s.textbooks.length ? <li className="text-muted">None yet.</li> : null}
        </ul>
        <ActionForm action={saveTextbook} submitLabel="Add textbook" resetOnSuccess>
          <input type="hidden" name="subjectId" value={s.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField name="title" label="Title *" required className="sm:col-span-2" />
            <TextField name="authors" label="Authors *" required />
            <TextField name="edition" label="Edition" />
            <TextField name="publisher" label="Publisher" />
            <TextField name="year" label="Year" type="number" min={1900} max={2100} />
          </div>
        </ActionForm>
      </section>
    </>
  );
}
