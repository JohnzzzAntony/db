"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { formAction, UserFacingError } from "@/lib/actions";

export const updateAcademicContext = formAction(
  "STUDENT",
  z.object({ regulationId: z.string().min(1, "Choose a course regulation"), academicYearId: z.string().optional() }),
  async ({ regulationId, academicYearId }, user) => {
    const regulation = await db.regulation.findUnique({ where: { id: regulationId }, include: { academicYears: true } });
    if (!regulation) throw new UserFacingError("That regulation no longer exists.");
    // A year from a different regulation would silently mix syllabuses.
    const yearId = regulation.academicYears.some((y) => y.id === academicYearId) ? academicYearId : null;
    await db.user.update({ where: { id: user.id }, data: { regulationId, academicYearId: yearId } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Academic profile updated." };
  },
);
