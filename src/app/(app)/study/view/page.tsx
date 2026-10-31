"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/badge";
import { Diagram } from "@/components/diagram";
import { Flashcards } from "@/components/flashcards";
import { PrintButton } from "@/components/print-button";
import { getOne, type StudyDoc } from "@/lib/store";
import { MODE_LABELS, type StudyModeKey } from "@/lib/study/plan";

const EVIDENCE = {
  SOURCE_SUPPORTED: { label: "Source-supported", variant: "ok" },
  STANDARD_TEXTBOOK: { label: "Standard textbook content", variant: "brand" },
  NEEDS_VERIFICATION: { label: "Needs verification", variant: "warn" },
} as const;

export default function StudyViewPage() {
  return (
    <Suspense>
      <StudyView />
    </Suspense>
  );
}

function StudyView() {
  const id = useSearchParams().get("id") ?? "";
  const [doc, setDoc] = useState<StudyDoc | null | undefined>(undefined);

  useEffect(() => {
    getOne("docs", id)
      .then((d) => setDoc(d ?? null))
      .catch(() => setDoc(null));
  }, [id]);

  useEffect(() => {
    if (doc) document.title = `${doc.topic} · Koshys Nursing Study`;
  }, [doc]);

  if (doc === undefined) return <p className="text-sm text-muted">Loading…</p>;
  if (doc === null) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <h1 className="font-serif text-2xl font-semibold">Document not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted, or it was saved in a different browser or device.</p>
        <Link href="/study" className="btn mt-4">Go to Study Generator</Link>
      </div>
    );
  }

  const c = doc.content;
  const diagrams = c.diagrams ?? [];
  // Real images come from search engines; the AI only suggests what to search for.
  const imageSearches = c.imageSearches?.length ? c.imageSearches : [`${doc.topic} labelled diagram`];
  const contents = [
    ...c.sections.map((s, i) => ({ href: `#sec-${i}`, label: s.heading })),
    ...(diagrams.length || c.flowchart ? [{ href: "#diagrams", label: "Diagrams" }] : []),
    { href: "#images", label: "Pictures" },
    ...(c.memoryAids.length ? [{ href: "#aids", label: "Memory aids" }] : []),
    ...(c.vivaQuestions.length ? [{ href: "#viva", label: "Flashcards" }] : []),
  ];

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="text-sm text-muted">
          {MODE_LABELS[doc.mode as StudyModeKey] ?? doc.mode} · {doc.marks} marks{doc.subject ? ` · ${doc.subject}` : ""} · Target {c.plan.wordTarget}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{c.title}</h1>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <PrintButton />
          <Link href={`/study?topic=${encodeURIComponent(doc.topic)}${doc.subject ? `&subject=${encodeURIComponent(doc.subject)}` : ""}`} className="btn-secondary">
            Make another version
          </Link>
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
            {c.flowchart ? (
              <figure className="space-y-2">
                <figcaption className="font-semibold">{c.flowchart.title}</figcaption>
                <ol className="flex flex-col items-center gap-1">
                  {c.flowchart.steps.map((step, i) => (
                    <li key={i} className="flex w-full max-w-xl flex-col items-center">
                      <span className="w-full rounded-lg border border-brand bg-brand-soft px-4 py-2 text-center text-sm">{step}</span>
                      {i < c.flowchart!.steps.length - 1 ? <span aria-hidden className="text-brand">↓</span> : null}
                    </li>
                  ))}
                </ol>
              </figure>
            ) : null}
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
      </div>
      <p className="mt-4 text-xs text-muted">Generated {new Date(doc.createdAt).toLocaleString("en-IN")} with {doc.model}. Saved on this device only.</p>
    </article>
  );
}
