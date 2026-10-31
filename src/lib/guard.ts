import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { allowRequest } from "@/lib/rate-limit";

export const errorResponse = (status: number, message: string) => Response.json({ error: message }, { status });

function codeMatches(given: string | null) {
  if (!env.ACCESS_CODE) return true;
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(env.ACCESS_CODE);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Access code + per-device hourly limit shared by every AI route. Returns an error response, or null to proceed. */
export function guardAiRequest(req: Request, bucket: string, limit: number): Response | null {
  if (!codeMatches(req.headers.get("x-access-code"))) return errorResponse(401, "Enter the access code your college gave you (Settings).");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`${bucket}:${ip}`, limit)) return errorResponse(429, `You have reached ${limit} requests this hour. Please try again later.`);
  return null;
}
