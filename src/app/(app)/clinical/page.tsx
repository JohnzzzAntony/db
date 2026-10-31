"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { REQUIREMENTS } from "@/lib/data/requirements";
import { getSetting, setSetting } from "@/lib/store";

type Progress = Record<string, number>;

export default function ClinicalPage() {
  const [done, setDone] = useState<Progress | null>(null);

  useEffect(() => {
    getSetting<Progress>("clinicalProgress", {}).then(setDone).catch(() => setDone({}));
  }, []);

  function change(id: string, value: number, max: number) {
    const next = { ...done, [id]: Math.max(0, Math.min(max, value)) };
    setDone(next);
    setSetting("clinicalProgress", next).catch(() => undefined);
  }

  const all = REQUIREMENTS.flatMap((g) => g.items);
  const total = all.reduce((n, r) => n + r.quantity, 0);
  const completed = done ? all.reduce((n, r) => n + Math.min(done[r.id] ?? 0, r.quantity), 0) : 0;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <PageHeader title="Clinical Records" description="Koshys College of Nursing clinical requirements. Tick off work as you finish it; progress is saved on this device." />
      <section className="card mb-6" aria-label="Overall progress">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">{completed} of {total} done</p>
          <p className="font-serif text-2xl font-semibold text-brand-strong">{pct}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        {REQUIREMENTS.map((g) => (
          <section key={g.area} className="card" aria-labelledby={g.area}>
            <h2 id={g.area} className="mb-3 font-semibold text-brand-strong">{g.area}</h2>
            <ul className="space-y-3 text-sm">
              {g.items.map((r) => {
                const n = done?.[r.id] ?? 0;
                const finished = n >= r.quantity;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    {r.quantity === 1 ? (
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="checkbox" className="mt-0.5 accent-[var(--brand)]" checked={finished} disabled={!done} onChange={(e) => change(r.id, e.target.checked ? 1 : 0, 1)} />
                        <span className={finished ? "text-muted line-through" : ""}>{r.title}</span>
                      </label>
                    ) : (
                      <>
                        <span className={finished ? "text-muted line-through" : ""}>{r.title}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" className="btn-secondary px-2 py-0.5" disabled={!done || n === 0} onClick={() => change(r.id, n - 1, r.quantity)} aria-label={`One less: ${r.title}`}>−</button>
                          <span className="w-12 text-center tabular-nums" aria-live="polite">{n}/{r.quantity}</span>
                          <button type="button" className="btn-secondary px-2 py-0.5" disabled={!done || finished} onClick={() => change(r.id, n + 1, r.quantity)} aria-label={`One more: ${r.title}`}>+</button>
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
