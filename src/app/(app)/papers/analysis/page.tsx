import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { Badge, ConfidenceBadge } from "@/components/badges";
import { EXAM_TYPE_LABELS, examSession, QUESTION_TYPE_LABELS } from "@/lib/labels";
import { getRepeatedQuestions, listSubjectScopes } from "@/lib/papers/queries";
import type { YearStatus } from "@/lib/papers/analysis";
import { QUESTION_TYPES } from "@/lib/papers/extraction-schema";
import type { QuestionType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Repeated Questions" };

type SP = { universityId?: string; subject?: string; type?: string; view?: string };

const YEAR_STYLE: Record<YearStatus, { cls: string; label: string }> = {
  VERIFIED: { cls: "bg-ok-bg text-ok-fg border-ok-fg/30", label: "Verified" },
  UNVERIFIED: { cls: "bg-warn-bg text-warn-fg border-warn-fg/30", label: "Not verified" },
  NOT_FOUND: { cls: "bg-surface text-muted border-border", label: "Not found" },
  NO_PAPER: { cls: "bg-surface text-muted border-dashed border-border", label: "No paper available" },
};

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const universities = await db.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const userUni = user.regulationId
    ? (await db.regulation.findUnique({ where: { id: user.regulationId }, select: { universityId: true } }))?.universityId
    : undefined;
  const universityId = sp.universityId ?? userUni ?? universities[0]?.id;
  const scopes = universityId ? await listSubjectScopes(universityId) : [];
  const subjectKey = sp.subject && scopes.some((s) => s.key === sp.subject) ? sp.subject : scopes[0]?.key;
  const type = (QUESTION_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as QuestionType) : undefined;

  const all = universityId && subjectKey ? await getRepeatedQuestions({ universityId, subjectKey, type }) : [];
  const rows =
    sp.view === "repeated"
      ? all.filter((r) => r.stats.labels.includes("FREQUENTLY_REPEATED"))
      : sp.view === "dormant"
        ? all.filter((r) => r.stats.notSeenRecently)
        : all;
  const repeated = all.filter((r) => r.stats.labels.includes("FREQUENTLY_REPEATED")).length;
  const scope = scopes.find((s) => s.key === subjectKey);

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { universityId, subject: subjectKey, type: sp.type, view: sp.view, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/papers/analysis?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Repeated question analysis"
        description="Built only from papers in the library. Verified appearances come from faculty-verified papers; questions from unverified uploads are shown but never counted as verified. Missing years mean no paper is available — not that the question wasn't asked."
      />

      <form className="card mb-6 grid gap-3 sm:grid-cols-4" aria-label="Analysis filters">
        <select name="universityId" defaultValue={universityId} aria-label="University" className="input">
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select name="subject" defaultValue={subjectKey} aria-label="Subject" className="input">
          {scopes.length ? scopes.map((s) => <option key={s.key} value={s.key}>{s.label} ({s.paperCount} papers)</option>) : <option value="">No papers yet</option>}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} aria-label="Question type" className="input">
          <option value="">All question types</option>
          {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
        </select>
        <button className="btn-secondary">Apply</button>
      </form>

      {scope ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" role="tablist" aria-label="Views">
            {[
              ["", `All questions (${all.length})`],
              ["repeated", `Repeated in 2+ verified papers (${repeated})`],
              ["dormant", "Not asked recently"],
            ].map(([v, label]) => (
              <Link key={v} href={qs({ view: v || undefined })} role="tab" aria-selected={(sp.view ?? "") === v} className={`rounded-full border px-3 py-1 ${(sp.view ?? "") === v ? "border-brand bg-brand-soft text-brand-strong" : "border-border"}`}>
                {label}
              </Link>
            ))}
          </div>

          {rows.length ? (
            <ol className="space-y-4">
              {rows.map((r) => (
                <li key={r.clusterId} id={`c-${r.clusterId}`} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-3xl font-medium">{r.canonicalText}</p>
                    <div className="text-right">
                      <p className="font-serif text-2xl font-semibold text-brand-strong">{r.stats.verifiedAppearances}</p>
                      <p className="text-xs text-muted">verified appearance{r.stats.verifiedAppearances === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {r.stats.labels.map((l) => <ConfidenceBadge key={l} label={l} />)}
                    {r.types.map((t) => <Badge key={t}>{QUESTION_TYPE_LABELS[t]}</Badge>)}
                    {r.stats.marksSeen.length ? <Badge>{r.stats.marksSeen.join(" / ")} marks</Badge> : null}
                    {r.topic ? <Badge variant="brand">{r.topic}</Badge> : null}
                    {r.stats.wordingVariants > 1 ? <Badge>{r.stats.wordingVariants} wordings</Badge> : null}
                    {r.stats.notSeenRecently ? <Badge variant="warn">Not asked since {r.stats.lastSeenYear}</Badge> : null}
                  </p>

                  {r.stats.timeline.length ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Appearance history">
                      {r.stats.timeline.map((t) => (
                        <li key={t.year} className={`rounded-md border px-2 py-1 text-xs ${YEAR_STYLE[t.status].cls}`}>
                          {t.year}: {YEAR_STYLE[t.status].label}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-brand">Sources ({r.appearances.length})</summary>
                    <ul className="mt-2 space-y-2">
                      {r.appearances.map((a, i) => (
                        <li key={i} className="rounded-md border border-border p-2">
                          <p>{a.questionText}</p>
                          <p className="mt-1 text-xs text-muted">
                            <Link href={`/papers/${a.paperId}`} className="link">{examSession(a.examMonth, a.examYear)}</Link> ·{" "}
                            {EXAM_TYPE_LABELS[a.examType as keyof typeof EXAM_TYPE_LABELS]} · {a.marks ?? "?"} marks ·{" "}
                            {a.verification === "VERIFIED" ? "verified paper" : "unverified paper"}
                            {a.sourceUrl ? <> · <a href={a.sourceUrl} className="link" target="_blank" rel="noopener noreferrer">source</a></> : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <p className="mt-3">
                    <Link href={`/study?topic=${encodeURIComponent(r.topic ?? r.canonicalText.slice(0, 180))}`} className="link text-sm">
                      Prepare an answer →
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="card text-sm text-muted">No questions in this view.</p>
          )}
        </>
      ) : (
        <p className="card text-sm text-muted">No papers for this university yet. <Link className="link" href="/papers/upload">Upload one</Link>.</p>
      )}
    </>
  );
}
