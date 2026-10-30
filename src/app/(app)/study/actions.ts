"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formAction, UserFacingError } from "@/lib/actions";
import { requireUser } from "@/lib/auth/dal";
import { generateStudyDocument } from "@/lib/study/generate";
import { MARKS_OPTIONS, STUDY_MODES, type Marks } from "@/lib/study/plan";

const schema = z.object({
  topic: z.string().trim().min(3, "Enter a topic").max(200, "Keep the topic under 200 characters"),
  subjectId: z.string().optional(),
  mode: z.enum(STUDY_MODES),
  marks: z.coerce
    .number()
    .refine((m): m is Marks => (MARKS_OPTIONS as readonly number[]).includes(m), "Choose marks"),
});

export const generateStudy = formAction("STUDENT", schema, async (input, user) => {
  const recent = await db.studyDocument.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= env.AI_HOURLY_LIMIT) {
    throw new UserFacingError(`You have reached ${env.AI_HOURLY_LIMIT} generations this hour. Please try again later.`);
  }
  if (input.subjectId && !(await db.subject.findUnique({ where: { id: input.subjectId }, select: { id: true } }))) {
    throw new UserFacingError("That subject no longer exists.");
  }
  const doc = await generateStudyDocument({
    userId: user.id,
    topic: input.topic,
    subjectId: input.subjectId ?? null,
    mode: input.mode,
    marks: input.marks as Marks,
  });
  redirect(`/study/${doc.id}`);
});

export async function deleteStudy(id: string) {
  const user = await requireUser();
  await db.studyDocument.deleteMany({ where: { id, userId: user.id } });
  redirect("/study");
}
