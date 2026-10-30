import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "@/lib/env";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI features are not configured. Set ANTHROPIC_API_KEY on the server.");
  }
}

/** User-safe message for a failed generation (refusal, truncation, invalid output). */
export class AiGenerationError extends Error {}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export const aiEnabled = () => Boolean(env.ANTHROPIC_API_KEY);

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * One structured-output call. Streams (long outputs would otherwise hit HTTP timeouts),
 * enables server-side refusal fallback, and validates the JSON against `schema`.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  effort?: Effort;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; model: string }> {
  const stream = getClient().beta.messages.stream({
    model: env.ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? env.AI_EFFORT, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });

  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiGenerationError("The AI service is busy. Please try again in a minute.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      throw new AiGenerationError("The AI service returned an error. Please try again.");
    }
    throw err;
  }

  if (message.stop_reason === "refusal") {
    throw new AiGenerationError("The AI declined this request. Try rephrasing the topic in clinical terms.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AiGenerationError("The answer was too long to finish. Choose fewer marks or a narrower topic.");
  }

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiGenerationError("The AI returned malformed output. Please try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    console.error("AI output failed validation", parsed.error.issues.slice(0, 5));
    throw new AiGenerationError("The AI returned incomplete output. Please try again.");
  }
  return { data: parsed.data, model: message.model };
}
