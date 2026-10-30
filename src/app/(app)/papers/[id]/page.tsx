import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { aiEnabled } from "@/lib/ai/client";
import { Badge, VerificationBadge } from "@/components/badges";
import { PendingButton } from "@/components/forms";
import { EXAM_TYPE_LABELS, examSession, QUESTION_TYPE_LABELS } from "@/lib/labels";
import { getUniversityOptions } from "@/lib/papers/options";
import { subjectKeyFor } from "@/lib/papers/cluster";
import { deletePaper, reprocessPaper } from "../actions";
import { MetadataPanel, VerifyPanel } from "./faculty-panels";

export const maxDuration = 300;
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.questionPaper.findUnique({ where: { id: (await params).id }, select: { subjectNameRaw: true, examYear: true } });
  return { title: p ? `${p.subjectNameRaw ?? "Question paper"} ${p.examYear ?? ""}`.trim() : "Question paper" };
}

export default async function PaperPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const paper = await db.questionPaper.findUnique({
    where: { id },
    omit: { fileData: true },
    include: {
      university: true,
      regulation: true,
      subject: true,
      verifiedBy: { select: { name: true } },
      uploadedBy: { select: { name: true } },
      questions: { orderBy: { sortOrder: "asc" }, include: { unit: { select: { number: true, title: true } }, cluster: { select: { id: true, _count: { select: { questions: true } } } } } },
    },
  });
  if (!paper) notFound();
  const isFaculty = hasRole(user, "FACULTY");
  const universities = isFaculty ? await getUniversityOptions() : [];
  const fileUrl = `/api/papers/${paper.id}/file`;
  const analysisHref = `/papers/analysis?universityId=${paper.universityId}&subject=${encodeURIComponent(subjectKeyFor(paper))}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{paper.university.name}{paper.regulation ? ` · ${paper.regulation.name}` : ""}</p>
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">
            {paper.subject?.name ?? paper.subjectNameRaw ?? "Unidentified subject"} — {examSession(paper.examMonth, paper.examYear)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <VerificationBadge status={paper.verificationStatus} />
            {paper.examType !== "UNKNOWN" ? <Badge>{EXAM_TYPE_LABELS[paper.examType]}</Badge> : null}
            {paper.subjectCode ? <Badge>{paper.subjectCode}</Badge> : null}
            {paper.totalMarks ? <Badge>{paper.totalMarks} marks</Badge> : null}
            {paper.durationHours ? <Badge>{paper.durationHours} h</Badge> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={analysisHref} className="btn-secondary">Repetition analysis</Link>
          <a href={fileUrl} className="btn-secondary" target="_blank" rel="noopener">Open file</a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-2" aria-label="Paper viewer">
          {paper.mimeType === "application/pdf" ? (
            <object data={fileUrl} type="application/pdf" className="h-[75vh] w-full rounded-lg" aria-label="Question paper PDF">
              <p className="p-4 text-sm">Your browser can&apos;t show PDFs inline. <a className="link" href={fileUrl}>Download the paper</a>.</p>
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated, dynamic file
            <img src={fileUrl} alt={`Scanned question paper ${paper.fileName}`} className="w-full rounded-lg" />
          )}
        </section>

        <div className="space-y-6">
          <section className="card" aria-labelledby="qs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="qs" className="font-semibold">Extracted questions</h2>
              <Badge variant={paper.extractionStatus === "DONE" ? "ok" : paper.extractionStatus === "FAILED" ? "danger" : "muted"}>
                Extraction: {paper.extractionStatus.toLowerCase()}
              </Badge>
            </div>
            {paper.extractionError ? (
              <p className="mb-3 rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">{paper.extractionError}</p>
            ) : null}
            {paper.questions.length ? (
              <ol className="space-y-3">
                {paper.questions.map((q) => (
                  <li key={q.id} className="rounded-lg border border-border p-3 text-sm">
                    <p><span className="font-semibold">{q.number}.</span> {q.text}</p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      <Badge>{QUESTION_TYPE_LABELS[q.type]}</Badge>
                      {q.marks != null ? <Badge>{q.marks} marks</Badge> : null}
                      {q.unit ? <Badge>Unit {q.unit.number}</Badge> : null}
                      {q.topic ? <Badge variant="brand">{q.topic}</Badge> : null}
                      {q.cluster && q.cluster._count.questions > 1 ? (
                        <Link href={`${analysisHref}#c-${q.cluster.id}`}><Badge variant="ok">Seen in {q.cluster._count.questions} papers</Badge></Link>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">
                {aiEnabled() ? "No questions extracted yet." : "AI extraction is not configured on this server, so questions can't be read automatically."}
              </p>
            )}
            {isFaculty && aiEnabled() ? (
              <form action={reprocessPaper.bind(null, paper.id)} className="mt-4">
                <PendingButton className="btn-secondary" pendingText="Re-reading paper…">Re-run extraction</PendingButton>
              </form>
            ) : null}
            <p className="mt-3 text-xs text-muted">Extracted by AI from the file. Compare with the original before relying on exact wording.</p>
          </section>

          <section className="card text-sm" aria-labelledby="prov">
            <h2 id="prov" className="mb-2 font-semibold">Provenance</h2>
            <dl className="grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">Source</dt>
              <dd>{paper.sourceUrl ? <a href={paper.sourceUrl} className="link break-all" rel="noopener noreferrer" target="_blank">{paper.sourceUrl}</a> : "Uploaded file (no public URL)"}</dd>
              <dt className="text-muted">Uploaded by</dt>
              <dd>{paper.uploadedBy?.name ?? "—"} on {paper.createdAt.toLocaleDateString("en-IN")}</dd>
              <dt className="text-muted">Verification</dt>
              <dd>
                {paper.verifiedBy ? `${paper.verificationStatus.toLowerCase()} by ${paper.verifiedBy.name}${paper.verifiedAt ? ` on ${paper.verifiedAt.toLocaleDateString("en-IN")}` : ""}` : "Not reviewed"}
                {paper.verificationNote ? <span className="block text-muted">“{paper.verificationNote}”</span> : null}
              </dd>
            </dl>
          </section>

          {isFaculty ? (
            <>
              <section className="card" aria-labelledby="ver">
                <h2 id="ver" className="mb-3 font-semibold">Verify paper</h2>
                <VerifyPanel paperId={paper.id} status={paper.verificationStatus} note={paper.verificationNote} />
              </section>
              <details className="card">
                <summary className="cursor-pointer font-semibold">Edit paper details</summary>
                <div className="mt-4">
                  <MetadataPanel
                    paperId={paper.id}
                    universities={universities}
                    defaults={{ ...paper, examType: paper.examType }}
                  />
                </div>
              </details>
              {hasRole(user, "ADMIN") ? (
                <form action={deletePaper.bind(null, paper.id)}>
                  <button className="btn-danger">Delete paper permanently</button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
