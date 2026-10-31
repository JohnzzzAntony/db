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
import { Diagram } from "./diagram";
import { Flashcards } from "./flashcards";

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
  const diagrams = c.diagrams ?? [];
  // Real images come from search engines; the AI only suggests what to search for.
  const imageSearches = c.imageSearches?.length ? c.imageSearches : [`${doc.topic} labelled diagram`];
  const contents = [
    ...c.sections.map((s, i) => ({ href: `#sec-${i}`, label: s.heading })),
    ...(diagrams.length || c.flowchart ? [{ href: "#diagrams", label: "Diagrams" }] : []),
    { href: "#images", label: "Pictures" },
    ...(c.memoryAids.length ? [{ href: "#aids", label: "Memory aids" }] : []),
    ...(c.vivaQuestions.length ? [{ href: "#viva", label: "Flashcards" }] : []),
    { href: "#refs", label: "References" },
  ];

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

      <nav aria-label="Contents" className="no-print sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <ul className="flex gap-2 whitespace-nowrap text-sm">
          {contents.map((x) => (
            <li key={x.href}>
              <a href={x.href} className="inline-block rounded-full border border-border bg-surface px-3 py-1 hover:border-brand hover:text-brand">{x.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="card space-y-8">
        {c.sections.map((s, i) => {
          const ev = EVIDENCE[s.evidence];
          return (
            <section key={i} aria-labelledby={`sec-${i}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 id={`sec-${i}`} className="scroll-mt-16 font-serif text-xl font-semibold">{s.heading}</h2>
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

        {diagrams.length || c.flowchart ? (
          <section aria-labelledby="diagrams" className="space-y-6">
            <h2 id="diagrams" className="scroll-mt-16 font-serif text-xl font-semibold">Diagrams</h2>
            {diagrams.map((d, i) => (
              <figure key={i} className="space-y-2">
                <figcaption>
                  <span className="block font-semibold">{d.title}</span>
                  <span className="block text-sm text-muted">{d.caption}</span>
                </figcaption>
                <Diagram source={d.mermaid} title={d.title} />
              </figure>
            ))}
          </section>
        ) : null}

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

        <section aria-labelledby="images" className="no-print">
          <h2 id="images" className="mb-1 scroll-mt-16 font-serif text-xl font-semibold">Pictures to look at</h2>
          <p className="mb-3 text-sm text-muted">Real labelled images from image libraries. Each link opens a search in a new tab; check that a picture matches your textbook.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {imageSearches.map((q) => (
              <li key={q} className="rounded-lg border border-border p-3 text-sm">
                <span className="block font-medium">{q}</span>
                <span className="mt-1 flex flex-wrap gap-3">
                  <a className="link" target="_blank" rel="noopener noreferrer" href={`https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=${encodeURIComponent(q)}`}>Wikimedia Commons ↗</a>
                  <a className="link" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`}>Google Images ↗</a>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {c.memoryAids.length ? (
          <section aria-labelledby="aids">
            <h2 id="aids" className="mb-2 scroll-mt-16 font-serif text-xl font-semibold">Memory aids</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {c.memoryAids.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {c.vivaQuestions.length ? (
          <section aria-labelledby="viva">
            <h2 id="viva" className="mb-1 scroll-mt-16 font-serif text-xl font-semibold">Flashcards</h2>
            <p className="no-print mb-3 text-sm text-muted">Say your answer aloud, then flip the card.</p>
            <Flashcards cards={c.vivaQuestions} />
            <ol className="hidden space-y-2 text-sm print:block">
              {c.vivaQuestions.map((q, i) => (
                <li key={i}>
                  <p className="font-medium">{i + 1}. {q.question}</p>
                  <p>{q.answer}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="refs">
          <h2 id="refs" className="mb-2 scroll-mt-16 font-serif text-xl font-semibold">References</h2>
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
