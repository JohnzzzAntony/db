import { env } from "@/lib/env";
import { aiEnabled } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** What the browser needs to know before showing the study form. */
export function GET() {
  return Response.json({ ai: aiEnabled(), accessCodeRequired: Boolean(env.ACCESS_CODE) });
}
