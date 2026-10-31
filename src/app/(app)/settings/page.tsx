"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { fetchStatus, type ServerStatus } from "@/lib/api";
import { clearAll, exportBackup, getSetting, importBackup, requestPersistence, setSetting } from "@/lib/store";

export default function SettingsPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetchStatus().then(setStatus);
    getSetting("accessCode", "").then(setCode).catch(() => undefined);
  }, []);

  async function download() {
    try {
      const blob = await exportBackup();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `koshys-nursing-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setMsg("Backup downloaded. Keep it somewhere safe, e.g. Google Drive.");
    } catch {
      setMsg("Couldn't create the backup.");
    }
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const r = await importBackup(file);
      setMsg(`Restored ${r.docs} study document(s) and ${r.papers} paper(s).`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Everything you save stays in this browser on this device." />
      <div className="grid max-w-3xl gap-6">
        {msg ? <p role="status" className="rounded-lg bg-ok-bg px-3 py-2 text-sm text-ok-fg">{msg}</p> : null}

        {status?.accessCodeRequired ? (
          <section className="card space-y-3" aria-labelledby="code-h">
            <h2 id="code-h" className="font-semibold">Access code</h2>
            <p className="text-sm text-muted">Your college shares this code so only students can use the AI study generator.</p>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await setSetting("accessCode", code.trim());
                setMsg("Access code saved on this device.");
              }}
            >
              <label htmlFor="code" className="sr-only">Access code</label>
              <input id="code" className="input max-w-xs" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
              <button className="btn">Save code</button>
            </form>
          </section>
        ) : null}

        <section className="card space-y-3" aria-labelledby="backup-h">
          <h2 id="backup-h" className="font-semibold">Backup</h2>
          <p className="text-sm text-muted">
            Browser data can be lost if you clear your history, use private mode, or change phone. Download a backup now and then,
            and restore it on any device.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={download}>Download backup</button>
            <label className="btn-secondary cursor-pointer">
              Restore from backup
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => restore(e.target.files?.[0])} />
            </label>
            <button
              className="btn-secondary"
              onClick={async () => setMsg((await requestPersistence()) ? "This browser will keep your data unless you clear it yourself." : "This browser didn't allow permanent storage; keep regular backups.")}
            >
              Keep my data safe
            </button>
          </div>
        </section>

        <section className="card space-y-3" aria-labelledby="clear-h">
          <h2 id="clear-h" className="font-semibold">Delete everything</h2>
          <p className="text-sm text-muted">Removes all study documents, saved papers and progress from this browser.</p>
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">This can&apos;t be undone. Delete all data?</span>
              <button className="btn-danger" onClick={async () => { await clearAll(); setConfirmClear(false); setCode(""); setMsg("All data on this device was deleted."); }}>Delete all</button>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirmClear(true)}>Delete all data…</button>
          )}
        </section>
      </div>
    </>
  );
}
