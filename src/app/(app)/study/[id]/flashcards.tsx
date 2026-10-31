"use client";

import { useState } from "react";

type Card = { question: string; answer: string };

/** Viva questions as flip cards: answer hidden until asked, with a running "known" count. */
export function Flashcards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const card = cards[i];
  const go = (n: number) => {
    setI((n + cards.length) % cards.length);
    setShown(false);
  };
  const mark = (ok: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (ok) next.add(i);
      else next.delete(i);
      return next;
    });
    go(i + 1);
  };

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Card {i + 1} of {cards.length}</span>
        <span aria-live="polite">{known.size} of {cards.length} known</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full bg-brand transition-all" style={{ width: `${(known.size / cards.length) * 100}%` }} />
      </div>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
        className="block min-h-40 w-full rounded-xl border border-border bg-brand-soft p-5 text-left transition hover:border-brand"
      >
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{shown ? "Answer" : "Question — tap to see the answer"}</span>
        <span className="mt-2 block text-base">{shown ? card.answer : card.question}</span>
      </button>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => go(i - 1)}>← Previous</button>
        {shown ? (
          <>
            <button type="button" className="btn" onClick={() => mark(true)}>I knew it</button>
            <button type="button" className="btn-secondary" onClick={() => mark(false)}>Revise again</button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setShown(true)}>Show answer</button>
        )}
        <button type="button" className="btn-secondary" onClick={() => go(i + 1)}>Next →</button>
      </div>
    </div>
  );
}
