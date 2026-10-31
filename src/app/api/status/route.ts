import { env } from "@/lib/env";
import { studyProvider } from "@/lib/ai/provider";
import { nvidiaEnabled } from "@/lib/ai/nvidia";
import { webResearchEnabled } from "@/lib/research/tavily";

export const dynamic = "force-dynamic";

/** What the browser needs to know before showing the study form. */
export function GET() {
  return Response.json({
    ai: Boolean(studyProvider()),
    chat: nvidiaEnabled(),
    webResearch: webResearchEnabled(),
    accessCodeRequired: Boolean(env.ACCESS_CODE),
  });
}
