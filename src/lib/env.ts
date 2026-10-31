import { z } from "zod";

const schema = z.object({
  // Claude writes the study material. Without a key the rest of the site still works.
  // Trim spaces and stray quotes pasted into hosting dashboards.
  ANTHROPIC_API_KEY: z.string().trim().transform((v) => v.replace(/^["']|["']$/g, "")).optional(),
  ANTHROPIC_MODEL: z
    .string()
    .trim()
    .transform((v) => v.replace(/^["']|["']$/g, "") || "claude-opus-5-5")
    .default("claude-opus-5-5"),
  AI_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
  /** Shared code students enter once; without it anyone who finds the site can spend the AI quota. */
  ACCESS_CODE: z.string().optional(),
  /** Generations allowed per device per rolling hour (best effort, see rate-limit.ts). */
  AI_HOURLY_LIMIT: z.coerce.number().int().positive().default(20),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = schema.parse(process.env);
