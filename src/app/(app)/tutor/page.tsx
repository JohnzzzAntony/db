"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/page-header";
import { fetchStatus, requestChat, type ChatTurn, type ServerStatus } from "@/lib/api";
import { getSetting, setSetting } from "@/lib/store";

const STARTERS = [
  "Explain renal failure in simple language",
  "Nursing management of pneumonia",
  "Ask me 5 questions on maternal nursing",
  "Difference between type 1 and type 2 diabetes",
];

export default function TutorPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus().then(setStatus);
    // The conversation is kept on this device so a reload doesn't lose it.
    getSetting<ChatTurn[]>("tutorChat", []).then(setTurns).catch(() => undefined);
    return () => abort.current?.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setInput("");
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const { answer, sources } = await requestChat(next, abort.current.signal);
      const done: ChatTurn[] = [...next, { role: "assistant", content: answer, sources }];
      setTurns(done);
      setSetting("tutorChat", done.slice(-30)).catch(() => undefined);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setTurns(turns);
      setInput(q);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    abort.current?.abort();
    setTurns([]);
    setSetting("tutorChat", []).catch(() => undefined);
  }

  return (
    <>
      <PageHeader
        title="Ask the Tutor"
        description="Ask any nursing question in English or Malayalam. The tutor searches trusted medical websites first and shows the sources it used."
        actions={turns.length ? <button className="btn-secondary" onClick={clear}>New chat</button> : null}
      />
      {status && !status.chat ? (
        <p className="card text-sm text-muted">The tutor isn&apos;t set up on this server yet (NVIDIA_API_KEY is missing).</p>
      ) : (
        <div className="card mx-auto max-w-4xl space-y-5">
          {status && !status.webResearch ? (
            <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">Web research is off on this server (TAVILY_API_KEY is missing), so answers come from the AI&apos;s own knowledge without sources.</p>
          ) : null}

          {!turns.length ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-brand hover:text-brand">{s}</button>
                ))}
              </div>
            </div>
          ) : null}

          <ol className="space-y-5" aria-live="polite">
            {turns.map((t, i) =>
              t.role === "user" ? (
                <li key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-soft px-4 py-2.5 text-sm">{t.content}</li>
              ) : (
                <li key={i} className="space-y-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-serif">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.content}</ReactMarkdown>
                  </div>
                  {t.sources?.length ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted">Sources ({t.sources.length})</summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                        {t.sources.map((s) => (
                          <li key={s.url}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="link break-words">{s.title}</a>
                            <span className="block text-xs text-muted">{new URL(s.url).hostname.replace(/^www\./, "")}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : (
                    <p className="text-xs text-muted">No web sources were used for this answer; check it against your textbook.</p>
                  )}
                </li>
              ),
            )}
            {busy ? <li className="text-sm text-muted">Searching the web and writing an answer…</li> : null}
          </ol>
          <div ref={endRef} />

          {error ? (
            <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              {error} {/access code/i.test(error) ? <Link href="/settings" className="link">Open Settings</Link> : null}
            </p>
          ) : null}

          <form
            className="flex items-end gap-2 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="q" className="sr-only">Your question</label>
            <textarea
              id="q"
              rows={2}
              maxLength={4000}
              className="input min-h-12 flex-1 resize-y"
              placeholder="e.g. Explain the nursing management of congestive heart failure"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(input);
                }
              }}
            />
            <button className="btn" disabled={busy || !input.trim()}>Ask</button>
          </form>
          <p className="text-xs text-muted">AI answers can be wrong. Confirm drug doses and normal values with your textbook and faculty.</p>
        </div>
      )}
    </>
  );
}
