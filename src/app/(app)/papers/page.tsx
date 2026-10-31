"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PDF_PAPERS, RGUHS_INDEXES, searchFor } from "@/lib/data/papers";
import { SUBJECTS } from "@/lib/data/subjects";
import { getAll, newId, put, remove, type MyPaper } from "@/lib/store";

const MAX_MB = 25;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export default function PapersPage() {
  return (
    <Suspense>
      <Papers />
    </Suspense>
  );
}

function Papers() {
  const initial = useSearchParams().get("subject") ?? "";
  const [subject, setSubject] = useState(SUBJECTS.some((s) => s.name === initial) ? initial : "");
  const shown = SUBJECTS.filter((s) => !subject || s.name === subject);

  return (
    <>
      <PageHeader
        title="Question Papers"
        description="Click a PDF to open the question paper. Links were found by web search and not checked; the PDFs are from college websites, not RGUHS, so use them for practice."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2" aria-labelledby="online">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="online" className="font-semibold">Papers online, by subject</h2>
            <label className="text-sm">
              <span className="sr-only">Subject</span>
              <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <ul className="space-y-3">
            {shown.map((s) => {
              const pdfs = PDF_PAPERS[s.name] ?? [];
              return (
                <li key={s.name} className="rounded-lg border border-border p-3">
                  <h3 className="font-semibold">{s.name} <span className="text-xs font-normal text-muted">Year {s.year}</span></h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {pdfs.map((p) => (
                      <li key={p.url}>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="link">PDF · {p.name} ↗</a>
                        <span className="block text-xs text-muted">{p.source}</span>
                      </li>
                    ))}
                    {!pdfs.length ? <li className="text-xs text-muted">No direct PDF found yet.</li> : null}
                    <li>
                      <a href={searchFor(s.name)} target="_blank" rel="noopener noreferrer" className="link">Search the web for RGUHS {s.name} papers ↗</a>
                    </li>
                  </ul>
                </li>
              );
            })}
          </ul>
          <div>
            <h3 className="mb-2 text-sm font-semibold">RGUHS paper collections</h3>
            <ul className="space-y-1.5 text-sm">
              {RGUHS_INDEXES.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="link">{p.name} ↗</a>
                  <span className="block text-xs text-muted">{p.source}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <MyPapers defaultSubject={subject} />
      </div>
    </>
  );
}

function MyPapers({ defaultSubject }: { defaultSubject: string }) {
  const [papers, setPapers] = useState<MyPaper[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () =>
    getAll("papers")
      .then((p) => setPapers(p.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => {
        setPapers([]);
        setMessage("This browser is blocking storage, so papers can't be saved here.");
      });
  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return setMessage("Choose a file first.");
    if (!ACCEPT.includes(file.type)) return setMessage("Use a PDF or a photo (PNG, JPEG or WebP).");
    if (file.size > MAX_MB * 1024 * 1024) return setMessage(`Files must be under ${MAX_MB} MB.`);
    try {
      await put("papers", {
        id: newId(),
        name: String(form.get("name") || file.name).slice(0, 200),
        subject: (form.get("subject") as string) || null,
        type: file.type,
        size: file.size,
        blob: file,
        createdAt: new Date().toISOString(),
      });
      formEl.reset();
      setMessage("Saved on this device.");
      load();
    } catch {
      setMessage("Couldn't save. The browser may be out of storage space.");
    }
  }

  function open(p: MyPaper) {
    const url = URL.createObjectURL(p.blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <section className="card space-y-4" aria-labelledby="mine">
      <h2 id="mine" className="font-semibold">My papers</h2>
      <p className="text-xs text-muted">Keep papers you got from your college or seniors. They stay on this device and open with one click.</p>
      <form onSubmit={onUpload} className="space-y-3">
        <input type="file" name="file" accept={ACCEPT.join(",")} className="input" aria-label="Question paper file" required />
        <input name="name" className="input" placeholder="Name, e.g. RGUHS MSN Feb 2024" maxLength={200} aria-label="Name" />
        <select name="subject" className="input" defaultValue={defaultSubject} key={defaultSubject} aria-label="Subject">
          <option value="">No subject</option>
          {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <button className="btn">Save paper</button>
        {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
      </form>
      {papers === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : papers.length ? (
        <ul className="divide-y divide-border text-sm">
          {papers.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 py-2">
              <button type="button" onClick={() => open(p)} className="link min-w-0 break-words text-left">
                {p.name}
                <span className="block text-xs font-normal text-muted">{p.subject ?? "No subject"} · {(p.size / 1024 / 1024).toFixed(1)} MB</span>
              </button>
              {confirmId === p.id ? (
                <span className="flex shrink-0 gap-1">
                  <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { await remove("papers", p.id); setConfirmId(null); load(); }}>Delete</button>
                  <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setConfirmId(null)}>Keep</button>
                </span>
              ) : (
                <button className="shrink-0 text-xs text-muted hover:text-danger" onClick={() => setConfirmId(p.id)} aria-label={`Delete ${p.name}`}>Delete</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No papers saved yet.</p>
      )}
    </section>
  );
}
