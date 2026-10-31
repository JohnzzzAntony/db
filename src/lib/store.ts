"use client";

import type { StudyContent } from "@/lib/study/schema";

// Everything a student saves lives in this browser's IndexedDB. Nothing is sent to a server.
export type StudyDoc = {
  id: string;
  topic: string;
  subject: string | null;
  mode: string;
  marks: number;
  content: StudyContent;
  model: string;
  createdAt: string;
};
export type MyPaper = { id: string; name: string; subject: string | null; type: string; size: number; blob: Blob; createdAt: string };

type Stores = { docs: StudyDoc; papers: MyPaper; kv: { key: string; value: unknown } };
type StoreName = keyof Stores;

const DB_NAME = "koshys-nursing";
let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("docs", { keyPath: "id" });
      db.createObjectStore("papers", { keyPath: "id" });
      db.createObjectStore("kv", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = null;
      reject(req.error ?? new Error("This browser blocked storage (private mode?)."));
    };
  });
  return opening;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Storage error"));
  });
}

export const getAll = <S extends StoreName>(store: S) => run<Stores[S][]>(store, "readonly", (s) => s.getAll());
export const getOne = <S extends StoreName>(store: S, id: string) => run<Stores[S] | undefined>(store, "readonly", (s) => s.get(id));
export const put = <S extends StoreName>(store: S, value: Stores[S]) => run<IDBValidKey>(store, "readwrite", (s) => s.put(value));
export const remove = (store: StoreName, id: string) => run<undefined>(store, "readwrite", (s) => s.delete(id));

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await getOne("kv", key);
  return row ? (row.value as T) : fallback;
}
export const setSetting = (key: string, value: unknown) => put("kv", { key, value });

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Asks the browser not to evict this site's data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ---------- Backup ----------

const BACKUP_VERSION = 1;

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export async function exportBackup(): Promise<Blob> {
  const [docs, papers, kv] = await Promise.all([getAll("docs"), getAll("papers"), getAll("kv")]);
  const papersOut = await Promise.all(papers.map(async ({ blob, ...p }) => ({ ...p, data: await toDataUrl(blob) })));
  // The access code stays on this device.
  const settings = kv.filter((row) => row.key !== "accessCode");
  return new Blob([JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), docs, papers: papersOut, kv: settings })], {
    type: "application/json",
  });
}

/** Restores a backup, merging by id (existing items with the same id are replaced). */
export async function importBackup(file: File): Promise<{ docs: number; papers: number }> {
  let data: { version?: number; docs?: StudyDoc[]; papers?: (Omit<MyPaper, "blob"> & { data: string })[]; kv?: Stores["kv"][] };
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file is not a backup from this app.");
  }
  if (data.version !== BACKUP_VERSION || !Array.isArray(data.docs)) throw new Error("That file is not a backup from this app.");
  for (const d of data.docs) if (d?.id && d.content) await put("docs", d);
  let papers = 0;
  for (const p of data.papers ?? []) {
    if (!p?.id || typeof p.data !== "string" || !p.data.startsWith("data:")) continue;
    const { data: url, ...rest } = p;
    await put("papers", { ...rest, blob: await (await fetch(url)).blob() });
    papers++;
  }
  for (const row of data.kv ?? []) if (row?.key && row.key !== "accessCode") await put("kv", row);
  return { docs: data.docs.length, papers };
}

export async function clearAll() {
  for (const s of ["docs", "papers", "kv"] as StoreName[]) await run(s, "readwrite", (st) => st.clear());
}
