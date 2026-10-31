import { env } from "@/lib/env";
import { studyProvider } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

/** What the browser needs to know before showing the study form. */
export function GET() {
  return Response.json({ ai: Boolean(studyProvider()), accessCodeRequired: Boolean(env.ACCESS_CODE) });
}
