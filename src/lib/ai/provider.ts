import "server-only";
import { env } from "@/lib/env";
import { aiEnabled } from "./client";
import { nvidiaEnabled } from "./nvidia";

/** Provider for study material, or null when none is configured. */
export function studyProvider(): "nvidia" | "anthropic" | null {
  const wanted = env.STUDY_AI_PROVIDER ?? (nvidiaEnabled() ? "nvidia" : "anthropic");
  if (wanted === "nvidia") return nvidiaEnabled() ? "nvidia" : aiEnabled() ? "anthropic" : null;
  return aiEnabled() ? "anthropic" : nvidiaEnabled() ? "nvidia" : null;
}
