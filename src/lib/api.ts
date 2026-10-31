"use client";

import { getSetting } from "@/lib/store";
import type { StudyContent } from "@/lib/study/schema";

export type ServerStatus = { ai: boolean; chat?: boolean; webResearch?: boolean; accessCodeRequired: boolean };

export async function fetchStatus(): Promise<ServerStatus> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    return res.ok ? await res.json() : { ai: false, accessCodeRequired: false };
  } catch {
    return { ai: false, accessCodeRequired: false };
  }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const code = await getSetting<string>("accessCode", "");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": code },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Couldn't reach the server. Check your internet connection.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `The server returned an error (${res.status}).`);
  return json as T;
}

export type ChatTurn = { role: "user" | "assistant"; content: string; sources?: { title: string; url: string }[] };

export const requestChat = (messages: ChatTurn[], signal?: AbortSignal) =>
  post<{ answer: string; sources: { title: string; url: string }[] }>(
    "/api/chat",
    { messages: messages.map(({ role, content }) => ({ role, content })) },
    signal,
  );

export const requestStudy = (input: { topic: string; subject: string | null; mode: string; marks: number }, signal?: AbortSignal) =>
  post<{ content: StudyContent; model: string }>("/api/study", input, signal);
