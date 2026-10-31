"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REQUIREMENTS } from "@/lib/data/requirements";
import { getAll, getSetting, type StudyDoc } from "@/lib/store";
import { MODE_LABELS, type StudyModeKey } from "@/lib/study/plan";

const STARTERS = ["Congestive Heart Failure", "Normal newborn assessment", "Stages of labour", "Play therapy", "Diabetes mellitus"];

export default function HomePage() {
  const [docs, setDocs] = useState<StudyDoc[] | null>(null);
  const [clinicalPct, setClinicalPct] = useState<number | null>(null);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    getAll("docs")
      .then((d) => setDocs(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)))
      .catch(() => {
        setDocs([]);
        setStorageOk(false);
      });
    getSetting<Record<string, number>>("clinicalProgress", {})
      .then((p) => {
        const items = REQUIREMENTS.flatMap((g) => g.items);
        const total = items.reduce((n, r) => n + r.quantity, 0);
        const done = items.reduce((n, r) => n + Math.min(p[r.id] ?? 0, r.quantity), 0);
        setClinicalPct(Math.round((done / total) * 100));
      })
      .catch(() => setClinicalPct(0));
  }, []);

  return (
    <>
      <section className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-accent">Koshys College of Nursing · Post Basic B.Sc. Nursing</p>
        <h1 className="max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Study smarter for your nursing exams.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Exam-ready answers with diagrams and flashcards, previous-year papers by subject, and your clinical record checklist. No account needed.
        </p>
      </section>

      {!storageOk ? (
        <p role="alert" className="mb-6 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          This browser is blocking storage (private mode?), so nothing you make can be saved. Open the site in a normal window.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="start">
          <h2 id="start" className="mb-3 font-semibold">Start with a topic</h2>
          <ul className="flex flex-wrap gap-2">
            {STARTERS.map((t) => (
              <li key={t}>
                <Link href={`/study?topic=${encodeURIComponent(t)}`} className="inline-block rounded-full border border-border px-3 py-1.5 text-sm hover:border-brand hover:text-brand">{t}</Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 mt-6 font-semibold">Recent study documents</h2>
          {docs === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : docs.length ? (
            <ul className="divide-y divide-border text-sm">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/study/view?id=${d.id}`} className="link">{d.topic}</Link>
                  <span className="text-muted">{MODE_LABELS[d.mode as StudyModeKey] ?? d.mode} · {d.marks} marks</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet. Pick a topic above to make your first one.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card" aria-labelledby="clin">
            <h2 id="clin" className="font-semibold">Clinical records</h2>
            <p className="mt-1 font-serif text-3xl font-semibold text-brand-strong">{clinicalPct ?? "–"}%</p>
            <p className="text-sm text-muted">of Koshys requirements done</p>
            <Link href="/clinical" className="link mt-2 inline-block text-sm">Update checklist →</Link>
          </section>
          <section className="card" aria-labelledby="more">
            <h2 id="more" className="mb-2 font-semibold">More</h2>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/papers" className="link">Question papers by subject</Link></li>
              <li><Link href="/subjects" className="link">All subjects</Link></li>
              <li><Link href="/settings" className="link">Back up your data</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
