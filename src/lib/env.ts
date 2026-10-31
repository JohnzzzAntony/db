import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  // Optional at boot so the app (config, library, papers) works without AI; AI routes check it.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  // Optional NVIDIA (OpenAI-compatible) model for study material. Paper reading and web discovery stay on Claude.
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_MODEL: z.string().default("nvidia/nemotron-3.5-bolt-e4b"),
  /** Which provider writes study material. Defaults to NVIDIA when its key is set. */
  STUDY_AI_PROVIDER: z.enum(["nvidia", "anthropic"]).optional(),
  AI_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
  /** Per-user cap on AI generations per rolling hour (cost control). */
  AI_HOURLY_LIMIT: z.coerce.number().int().positive().default(20),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(15),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = schema.parse(process.env);
