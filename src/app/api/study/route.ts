import { z } from "zod";
import { env } from "@/lib/env";
import { AiGenerationError, AiUnavailableError } from "@/lib/ai/client";
import { studyProvider } from "@/lib/ai/provider";
import { errorResponse as error, guardAiRequest } from "@/lib/guard";
import { generateStudyDocument } from "@/lib/study/generate";
import { MARKS_OPTIONS, STUDY_MODES, type Marks } from "@/lib/study/plan";
import { SUBJECT_NAMES } from "@/lib/data/subjects";

// Generation can take a few minutes.
export const maxDuration = 300;

const bodySchema = z.object({
  topic: z.string().trim().min(3, "Enter a topic").max(200, "Keep the topic under 200 characters"),
  subject: z.enum(SUBJECT_NAMES).nullable().default(null),
  mode: z.enum(STUDY_MODES),
  marks: z.number().refine((m): m is Marks => (MARKS_OPTIONS as readonly number[]).includes(m), "Choose marks"),
});

export async function POST(req: Request) {
  if (!studyProvider()) return error(503, "AI is not configured on this server.");
  const blocked = guardAiRequest(req, "study", env.AI_HOURLY_LIMIT);
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid request");

  try {
    const { topic, subject, mode, marks } = parsed.data;
    return Response.json(await generateStudyDocument({ topic, subject, mode, marks: marks as Marks }));
  } catch (e) {
    if (e instanceof AiGenerationError || e instanceof AiUnavailableError) return error(502, e.message);
    console.error("study generation failed", e);
    return error(500, "Something went wrong. Please try again.");
  }
}
