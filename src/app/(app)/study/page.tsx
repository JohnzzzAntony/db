"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { fetchStatus, requestStudy, type ServerStatus } from "@/lib/api";
import { SUBJECTS } from "@/lib/data/subjects";
import { getAll, newId, put, remove, type StudyDoc } from "@/lib/store";
import { MARKS_OPTIONS, MODE_LABELS, STUDY_MODES, type StudyModeKey } from "@/lib/study/plan";

const MODE_HELP: Record<StudyModeKey, string> = {
  UNIVERSITY_EXAM: "Model answer to write in the exam",
  QUICK_REVISION: "Key points, keywords, memory aids",
  DETAILED_RESEARCH: "In-depth, all sections, diagrams",
  VIVA: "Flashcards for oral exam practice",
};

export default function StudyPage() {
  return (
    <Suspense>
      <StudyGenerator />
    </Suspense>
  );
}

function StudyGenerator() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [docs, setDocs] = useState<StudyDoc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const loadDocs = () =>
    getAll("docs")
      .then((d) => setDocs(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setDocs([]));

  useEffect(() => {
    fetchStatus().then(setStatus);
    loadDocs();
    return () => abort.current?.abort();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const topic = String(form.get("topic") ?? "").trim();
    if (topic.length < 3) return setMessage("Enter a topic of at least 3 characters.");
    const input = {
      topic,
      subject: (form.get("subject") as string) || null,
      mode: String(form.get("mode")),
      marks: Number(form.get("marks")),
    };
    setBusy(true);
    setMessage(null);
    abort.current = new AbortController();
    try {
      const { content, model } = await requestStudy(input, abort.current.signal);
      const doc: StudyDoc = { id: newId(), ...input, content, model, createdAt: new Date().toISOString() };
      await put("docs", doc);
      router.push(`/study/view?id=${doc.id}`);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setMessage((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Study Material Generator"
        description="Type any nursing topic. You get an exam-ready answer with diagrams, picture links and flashcards, saved on this device."
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3" aria-label="Generate">
          {status && !status.ai ? (
            <p className="text-sm text-muted">AI is not set up on this server yet (NVIDIA_API_KEY is missing). You can still use Subjects, Question Papers and Clinical Records.</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="topic" className="label">Topic</label>
                <input id="topic" name="topic" className="input" required minLength={3} maxLength={200} placeholder="e.g. Congestive Heart Failure" defaultValue={params.get("topic") ?? ""} />
              </div>
              <div>
                <label htmlFor="subject" className="label">Subject <span className="font-normal text-muted">(optional)</span></label>
                <select id="subject" name="subject" className="input" defaultValue={params.get("subject") ?? ""}>
                  <option value="">Any subject</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.name} value={s.name}>{s.name} (Year {s.year})</option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="label">Mode</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STUDY_MODES.map((m, i) => (
                    <label key={m} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                      <input type="radio" name="mode" value={m} defaultChecked={i === 0} className="mt-1 accent-[var(--brand)]" />
                      <span>
                        <span className="block text-sm font-medium">{MODE_LABELS[m]}</span>
                        <span className="block text-xs text-muted">{MODE_HELP[m]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="label">Answer length</legend>
                <div className="flex flex-wrap gap-2">
                  {MARKS_OPTIONS.map((m) => (
                    <label key={m} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                      <input type="radio" name="marks" value={m} defaultChecked={m === 10} className="sr-only" />
                      {m} marks
                    </label>
                  ))}
                </div>
              </fieldset>
              {message ? (
                <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
                  {message} {/access code/i.test(message) ? <Link href="/settings" className="link">Open Settings</Link> : null}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn" disabled={busy || !status} aria-busy={busy}>
                  {busy ? "Writing your study material… (1–2 minutes)" : "Generate"}
                </button>
                {busy ? (
                  <button type="button" className="btn-secondary" onClick={() => { abort.current?.abort(); setBusy(false); }}>Cancel</button>
                ) : null}
              </div>
            </form>
          )}
        </section>

        <section className="card lg:col-span-2" aria-labelledby="hist">
          <h2 id="hist" className="mb-3 font-semibold">Saved on this device</h2>
          {docs === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : docs.length ? (
            <ul className="divide-y divide-border text-sm">
              {docs.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <Link href={`/study/view?id=${d.id}`} className="link break-words">{d.topic}</Link>
                    <span className="block text-xs text-muted">
                      {MODE_LABELS[d.mode as StudyModeKey] ?? d.mode} · {d.marks} marks{d.subject ? ` · ${d.subject}` : ""} · {new Date(d.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </span>
                  {confirmId === d.id ? (
                    <span className="flex shrink-0 gap-1">
                      <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { await remove("docs", d.id); setConfirmId(null); loadDocs(); }}>Delete</button>
                      <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setConfirmId(null)}>Keep</button>
                    </span>
                  ) : (
                    <button className="shrink-0 text-xs text-muted hover:text-danger" onClick={() => setConfirmId(d.id)} aria-label={`Delete ${d.topic}`}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet. Try “Congestive Heart Failure”.</p>
          )}
        </section>
      </div>
    </>
  );
}
