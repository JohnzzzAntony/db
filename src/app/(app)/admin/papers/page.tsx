import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { aiEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextField } from "@/components/fields";
import { Badge, VerificationBadge } from "@/components/badges";
import { examSession } from "@/lib/labels";
import { importPaperFromUrl, runDiscovery } from "../../papers/actions";

export const metadata: Metadata = { title: "Paper review & discovery" };
export const maxDuration = 300;

const EXAM_OPTIONS = [["UNKNOWN", "Not stated"], ["REGULAR", "Regular"], ["SUPPLEMENTARY", "Supplementary"]] as const;

export default async function AdminPapersPage() {
  await requireRole("FACULTY");
  const [queue, universities, candidates] = await Promise.all([
    db.questionPaper.findMany({
      where: { OR: [{ verificationStatus: "UNVERIFIED" }, { extractionStatus: "FAILED" }] },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true, examYear: true, examMonth: true, subjectNameRaw: true, verificationStatus: true, extractionStatus: true, sourceUrl: true, createdAt: true,
        university: { select: { shortName: true, name: true } },
        uploadedBy: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    }),
    db.university.findMany({
      orderBy: { name: "asc" },
      include: { regulations: { include: { academicYears: { include: { subjects: { select: { id: true, name: true } } } } } } },
    }),
    db.paperCandidate.findMany({ where: { imported: false }, orderBy: [{ examYear: "desc" }, { createdAt: "desc" }], take: 100, include: { university: { select: { name: true } } } }),
  ]);
  const uniOptions = universities.map((u) => [u.id, u.name] as [string, string]);
  const subjectOptions = (universityId: string): [string, string][] => [
    ["", "Let AI read it"],
    ...universities
      .filter((u) => u.id === universityId)
      .flatMap((u) => u.regulations.flatMap((r) => r.academicYears.flatMap((y) => y.subjects.map((s) => [s.id, `${s.name} (${y.label})`] as [string, string])))),
  ];

  return (
    <>
      <PageHeader title="Paper review & discovery" description="Verify uploaded papers against official copies, and find public papers on university websites." />

      <section className="card mb-6 overflow-x-auto" aria-labelledby="queue">
        <h2 id="queue" className="mb-3 font-semibold">Review queue ({queue.length})</h2>
        {queue.length ? (
          <table className="table">
            <thead><tr><th>Paper</th><th>University</th><th>Uploaded</th><th>Questions</th><th>Status</th></tr></thead>
            <tbody>
              {queue.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/papers/${p.id}`} className="link">{p.subjectNameRaw ?? "Unidentified"} — {examSession(p.examMonth, p.examYear)}</Link></td>
                  <td>{p.university.shortName ?? p.university.name}</td>
                  <td>{p.uploadedBy?.name ?? "—"}<span className="block text-xs text-muted">{p.createdAt.toLocaleDateString("en-IN")}</span></td>
                  <td>{p.extractionStatus === "FAILED" ? <Badge variant="danger">failed</Badge> : p._count.questions}</td>
                  <td><VerificationBadge status={p.verificationStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">Nothing to review.</p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card" aria-labelledby="disc">
          <h2 id="disc" className="mb-1 font-semibold">Discover papers on the web</h2>
          <p className="mb-3 text-xs text-muted">Uses AI web search. Only links returned by the search engine are saved — never links written by the AI — and nothing is imported automatically.</p>
          {aiEnabled() ? (
            <ActionForm action={runDiscovery} submitLabel="Search" pendingText="Searching…">
              <SelectField name="universityId" label="University" options={uniOptions} />
              <TextField name="query" label="What to find" defaultValue="Post Basic B.Sc. Nursing previous year question papers" required />
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">AI is not configured on this server.</p>
          )}
        </section>

        <section className="card" aria-labelledby="url">
          <h2 id="url" className="mb-3 font-semibold">Import a paper from a URL</h2>
          <ActionForm action={importPaperFromUrl} submitLabel="Download and extract" pendingText="Downloading and extracting…">
            <TextField name="url" label="Direct link to the PDF *" type="url" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField name="universityId" label="University" options={uniOptions} />
              <TextField name="examYear" label="Exam year" type="number" min={1990} max={2100} />
              <SelectField name="examType" label="Examination" options={EXAM_OPTIONS} />
            </div>
          </ActionForm>
        </section>
      </div>

      <section className="card mt-6" aria-labelledby="cand">
        <h2 id="cand" className="mb-3 font-semibold">Discovered links ({candidates.length})</h2>
        {candidates.length ? (
          <ul className="space-y-4">
            {candidates.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs"><a href={c.url} className="link break-all" target="_blank" rel="noopener noreferrer">{c.url}</a></p>
                <p className="mb-2 text-xs text-muted">{c.university.name} · search: “{c.query}”</p>
                <ActionForm action={importPaperFromUrl} submitLabel="Import" pendingText="Importing…" className="grid gap-2 sm:grid-cols-4 sm:items-end" submitClassName="btn-secondary">
                  <input type="hidden" name="url" value={c.url} />
                  <input type="hidden" name="candidateId" value={c.id} />
                  <input type="hidden" name="universityId" value={c.universityId} />
                  <SelectField name="subjectId" label="Subject" options={subjectOptions(c.universityId)} />
                  <TextField name="examYear" label="Exam year" type="number" min={1990} max={2100} defaultValue={c.examYear ?? ""} />
                  <SelectField name="examType" label="Examination" options={EXAM_OPTIONS} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No pending links.</p>
        )}
      </section>
    </>
  );
}
