import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { AiGenerationError } from "./client";

const endpoint = () => `${env.NVIDIA_BASE_URL}/chat/completions`;
const TIMEOUT_MS = 5 * 60 * 1000;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const nvidiaEnabled = () => Boolean(env.NVIDIA_API_KEY);

/** Pulls the JSON object out of a reply that may carry <think> blocks, code fences or stray prose. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** One plain chat completion; used directly by the tutor chat. */
export async function nvidiaChat(messages: ChatMessage[], maxTokens: number): Promise<string> {
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: env.NVIDIA_MODEL,
        messages,
        temperature: 0.5,
        top_p: 1,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("NVIDIA request failed", err);
    throw new AiGenerationError("The AI service could not be reached. Please try again.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new AiGenerationError("The NVIDIA API key was rejected. Ask an administrator to check NVIDIA_API_KEY.");
  }
  if (res.status === 429) throw new AiGenerationError("The AI service is busy. Please try again in a minute.");
  if (!res.ok) {
    console.error("NVIDIA API error", res.status, (await res.text().catch(() => "")).slice(0, 500));
    throw new AiGenerationError("The AI service returned an error. Please try again.");
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new AiGenerationError("The answer was too long to finish. Choose fewer marks or a narrower topic.");
  }
  return choice?.message?.content ?? "";
}

/**
 * Structured output via NVIDIA's OpenAI-compatible endpoint. The schema goes in the
 * prompt and the reply is validated with zod; one corrective retry on invalid JSON.
 */
export async function nvidiaStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; model: string }> {
  if (!nvidiaEnabled()) throw new AiGenerationError("NVIDIA AI is not configured on this server.");
  const schemaJson = JSON.stringify(z.toJSONSchema(opts.schema));
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${opts.system}\n\nReply with ONE JSON object only — no prose, no code fences — that matches this JSON Schema:\n${schemaJson}`,
    },
    { role: "user", content: opts.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await nvidiaChat(messages, opts.maxTokens ?? 16000);
    const json = extractJson(text);
    const parsed = json === undefined ? null : opts.schema.safeParse(json);
    if (parsed?.success) return { data: parsed.data, model: env.NVIDIA_MODEL };

    const problem = parsed
      ? parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
      : "no JSON object was found";
    console.error("NVIDIA output failed validation:", problem);
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `That reply was not valid (${problem}). Send the corrected JSON object only.` },
    );
  }
  throw new AiGenerationError("The AI returned incomplete output. Please try again.");
}
