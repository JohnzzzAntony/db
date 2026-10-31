import { z } from "zod";

const schema = z.object({
  // Study material comes from NVIDIA by default; Anthropic is an optional alternative.
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_MODEL: z.string().default("z-ai/glm-5.3-flash"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  /** Which provider writes study material. Defaults to NVIDIA when its key is set. */
  STUDY_AI_PROVIDER: z.enum(["nvidia", "anthropic"]).optional(),
  AI_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
  /** Shared code students enter once; without it anyone who finds the site can spend the AI quota. */
  ACCESS_CODE: z.string().optional(),
  /** Generations allowed per device per rolling hour (best effort, see rate-limit.ts). */
  AI_HOURLY_LIMIT: z.coerce.number().int().positive().default(20),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = schema.parse(process.env);
