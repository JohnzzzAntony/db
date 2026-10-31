"use client";

import { getSetting } from "@/lib/store";
import type { StudyContent } from "@/lib/study/schema";

export type ServerStatus = { ai: boolean; accessCodeRequired: boolean };

export async function fetchStatus(): Promise<ServerStatus> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    return res.ok ? await res.json() : { ai: false, accessCodeRequired: false };
  } catch {
    return { ai: false, accessCodeRequired: false };
  }
}

export async function requestStudy(input: { topic: string; subject: string | null; mode: string; marks: number }, signal?: AbortSignal) {
  const code = await getSetting<string>("accessCode", "");
  let res: Response;
  try {
    res = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": code },
      body: JSON.stringify(input),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Couldn't reach the server. Check your internet connection.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `The server returned an error (${res.status}).`);
  return body as { content: StudyContent; model: string };
}
