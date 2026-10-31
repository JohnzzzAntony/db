import { z } from "zod";

const schema = z.object({
  // NVIDIA's hosted models (OpenAI-compatible) are the default; Claude is an optional alternative.
  NVIDIA_API_KEY: z.string().trim().optional(),
  NVIDIA_MODEL: z.string().trim().default("z-ai/glm-5.3-flash"),
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  /** Which provider writes study material. Defaults to NVIDIA when its key is set. */
  STUDY_AI_PROVIDER: z.enum(["nvidia", "anthropic"]).optional(),
  // Tavily web search: answers are written from, and cite, the pages it finds.
  TAVILY_API_KEY: z.string().trim().optional(),
  TAVILY_BASE_URL: z.string().url().default("https://api.tavily.com"),
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
