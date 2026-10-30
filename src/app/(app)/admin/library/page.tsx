import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hasRole, requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextField } from "@/components/fields";
import { VerificationBadge } from "@/components/badges";
import { SOURCE_KIND_LABELS } from "@/lib/labels";
import { deleteSource, setSourceStatus, uploadSource } from "../actions";

export const metadata: Metadata = { title: "Reference library" };

export default async function LibraryPage() {
  const user = await requireRole("FACULTY");
  const isAdmin = hasRole(user, "ADMIN");
  const [sources, subjects] = await Promise.all([
    db.sourceDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { subject: { select: { name: true } }, uploadedBy: { select: { name: true } }, _count: { select: { chunks: true } } },
    }),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, academicYear: { select: { label: true } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Reference library"
        description="The study generator may cite only VERIFIED documents here. Upload excerpts you are licensed to use: lecture notes, national programme documents, guideline extracts, syllabus copies."
      />
      <section className="card mb-6" aria-labelledby="up">
        <h2 id="up" className="mb-3 font-semibold">Add a source</h2>
        <ActionForm action={uploadSource} submitLabel="Upload and index" resetOnSuccess pendingText="Reading and indexing…">
          <label className="block">
            <span className="label">File * (text-based PDF, TXT or MD, up to {env.MAX_UPLOAD_MB} MB)</span>
            <input type="file" name="file" required accept="application/pdf,text/plain,text/markdown,.md,.txt" className="input" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField name="title" label="Title *" required className="sm:col-span-2" />
            <SelectField name="kind" label="Kind" options={Object.entries(SOURCE_KIND_LABELS) as [string, string][]} />
            <TextField name="authors" label="Authors / issuing body" />
            <TextField name="publisher" label="Publisher" />
            <TextField name="edition" label="Edition / version" />
            <TextField name="year" label="Year" type="number" min={1900} max={2100} />
            <TextField name="url" label="Source URL" type="url" />
            <SelectField name="subjectId" label="Subject" options={[["", "All subjects"], ...subjects.map((s) => [s.id, `${s.name} (${s.academicYear.label})`] as [string, string])]} />
          </div>
          {!isAdmin ? <p className="text-xs text-muted">Your upload will be used once an administrator verifies it.</p> : null}
        </ActionForm>
      </section>

      <section className="card overflow-x-auto" aria-labelledby="list">
        <h2 id="list" className="mb-3 font-semibold">Sources ({sources.length})</h2>
        <table className="table">
          <thead><tr><th>Title</th><th>Kind</th><th>Subject</th><th>Passages</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="font-medium">{s.title}</span>
                  <span className="block text-xs text-muted">
                    {[s.authors, s.edition && `${s.edition} ed.`, s.year].filter(Boolean).join(" · ")} — added by {s.uploadedBy?.name ?? "unknown"}
                  </span>
                </td>
                <td>{SOURCE_KIND_LABELS[s.kind]}</td>
                <td>{s.subject?.name ?? "All"}</td>
                <td>{s._count.chunks}</td>
                <td><VerificationBadge status={s.verificationStatus} /></td>
                <td>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-1">
                      {s.verificationStatus !== "VERIFIED" ? (
                        <form action={setSourceStatus.bind(null, s.id, "VERIFIED")}><button className="btn-secondary px-2 py-1 text-xs">Verify</button></form>
                      ) : null}
                      {s.verificationStatus !== "REJECTED" ? (
                        <form action={setSourceStatus.bind(null, s.id, "REJECTED")}><button className="btn-secondary px-2 py-1 text-xs">Reject</button></form>
                      ) : null}
                      <form action={deleteSource.bind(null, s.id)}><button className="btn-danger px-2 py-1 text-xs">Delete</button></form>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sources.length ? <p className="mt-3 text-sm text-muted">The library is empty, so study documents will carry no citations until sources are added.</p> : null}
      </section>
    </>
  );
}
