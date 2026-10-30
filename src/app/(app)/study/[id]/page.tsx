import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { Badge } from "@/components/badges";
import { MODE_LABELS } from "@/lib/study/plan";
import type { ResolvedReference, StudyContent } from "@/lib/study/schema";
import { deleteStudy } from "../actions";
import { PrintButton } from "./print-button";

type Props = { params: Promise<{ id: string }> };

async function load(id: string, userId: string) {
  return db.studyDocument.findFirst({ where: { id, userId }, include: { subject: { select: { name: true } } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const doc = await load((await params).id, user.id);
  return { title: doc?.topic ?? "Study document", robots: { index: false } };
}

const EVIDENCE = {
  SOURCE_SUPPORTED: { label: "Source-supported", variant: "ok" },
  STANDARD_TEXTBOOK: { label: "Standard textbook content", variant: "brand" },
  NEEDS_VERIFICATION: { label: "Needs verification", variant: "warn" },
} as const;

function formatReference(r: ResolvedReference) {
  const parts = [r.authors, r.title, r.edition ? `${r.edition} ed.` : null, r.publisher, r.year].filter(Boolean);
  const base = parts.join(". ");
  return r.kind === "LIBRARY" && r.pages.length ? `${base}. Library excerpt, p. ${r.pages.join(", ")}` : base;
}

export default async function StudyDocPage({ params }: Props) {
  const user = await requireUser();
  const doc = await load((await params).id, user.id);
  if (!doc) notFound();
  const c = doc.content as unknown as StudyContent;
  const remove = deleteStudy.bind(null, doc.id);

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="text-sm text-muted">
          {MODE_LABELS[doc.mode]} · {doc.marks} marks{doc.subject ? ` · ${doc.subject.name}` : ""} · Target {c.plan.wordTarget}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{c.title}</h1>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <PrintButton />
          <form action={remove}>
            <button className="btn-danger">Delete</button>
          </form>
        </div>
      </header>

      <aside className="mb-6 rounded-xl border border-warn-fg/30 bg-warn-bg p-4 text-sm text-warn-fg" aria-label="About this document">
        <p className="font-semibold">AI-generated study aid — check before you rely on it.</p>
        <ul className="mt-1 list-disc pl-5">
          {c.caveats.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
          <li>Confirm drug doses, normal values and guideline targets against your prescribed textbooks and institutional protocols.</li>
        </ul>
      </aside>

      <div className="card space-y-8">
        {c.sections.map((s, i) => {
          const ev = EVIDENCE[s.evidence];
          return (
            <section key={i} aria-labelledby={`sec-${i}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 id={`sec-${i}`} className="font-serif text-xl font-semibold">{s.heading}</h2>
                <Badge variant={ev.variant}>{ev.label}</Badge>
                {s.references.map((r) => (
                  <a key={r} href={`#ref-${r + 1}`} className="text-xs text-brand">[{r + 1}]</a>
                ))}
              </div>
              {s.verificationNote ? (
                <p className="mb-2 rounded-md bg-warn-bg px-3 py-1.5 text-xs text-warn-fg">Verify: {s.verificationNote}</p>
              ) : null}
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-serif prose-table:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.markdown}</ReactMarkdown>
              </div>
            </section>
          );
        })}

        {c.flowchart ? (
          <section aria-labelledby="flow">
            <h2 id="flow" className="mb-3 font-serif text-xl font-semibold">{c.flowchart.title}</h2>
            <ol className="flex flex-col items-center gap-1">
              {c.flowchart.steps.map((step, i) => (
                <li key={i} className="flex w-full max-w-xl flex-col items-center">
                  <span className="w-full rounded-lg border border-brand bg-brand-soft px-4 py-2 text-center text-sm">{step}</span>
                  {i < c.flowchart!.steps.length - 1 ? <span aria-hidden className="text-brand">↓</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {c.memoryAids.length ? (
          <section aria-labelledby="aids">
            <h2 id="aids" className="mb-2 font-serif text-xl font-semibold">Memory aids</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {c.memoryAids.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {c.vivaQuestions.length ? (
          <section aria-labelledby="viva">
            <h2 id="viva" className="mb-3 font-serif text-xl font-semibold">Viva questions</h2>
            <ol className="space-y-3 text-sm">
              {c.vivaQuestions.map((q, i) => (
                <li key={i}>
                  <details className="no-print rounded-lg border border-border p-3">
                    <summary className="cursor-pointer font-medium">{i + 1}. {q.question}</summary>
                    <p className="mt-2 text-muted">{q.answer}</p>
                  </details>
                  {/* Closed <details> content doesn't print, so print a plain copy. */}
                  <div className="hidden print:block">
                    <p className="font-medium">{i + 1}. {q.question}</p>
                    <p>{q.answer}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="refs">
          <h2 id="refs" className="mb-2 font-serif text-xl font-semibold">References</h2>
          {c.references.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {c.references.map((r, i) => (
                <li key={i} id={`ref-${i + 1}`}>
                  {formatReference(r)}{" "}
                  <Badge>{r.kind === "LIBRARY" ? "College library source" : "Recommended textbook"}</Badge>
                  {r.kind === "LIBRARY" && r.url ? (
                    <> · <a href={r.url} className="link" rel="noopener noreferrer" target="_blank">Link</a></>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No verified references were available for this topic. Nothing has been cited that cannot be traced.</p>
          )}
        </section>
      </div>
      <p className="mt-4 text-xs text-muted">Generated {doc.createdAt.toLocaleString("en-IN")} with {doc.model}.</p>
    </article>
  );
}
