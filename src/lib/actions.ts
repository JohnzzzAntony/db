import "server-only";
import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { assertRole, AuthError, type CurrentUser } from "@/lib/auth/dal";
import { AiGenerationError, AiUnavailableError } from "@/lib/ai/client";
import { Prisma } from "@/generated/prisma/client";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

export class UserFacingError extends Error {}

/** Empty strings from forms become undefined so optional fields validate cleanly. */
export function formToObject(form: FormData) {
  const out: Record<string, FormDataEntryValue | undefined> = {};
  for (const [k, v] of form.entries()) out[k] = typeof v === "string" && v.trim() === "" ? undefined : v;
  return out;
}

export const optionalInt = z.coerce.number().int().optional();
export const optionalNumber = z.coerce.number().optional();
export const optionalUrl = z.string().trim().url().max(500).optional();

/**
 * Wraps a server action: checks the role, validates the form with `schema`, and turns
 * expected failures into an ActionState instead of a crash. Redirects pass through.
 */
export function formAction<S extends z.ZodType>(
  minRole: Role,
  schema: S,
  run: (input: z.infer<S>, user: CurrentUser, form: FormData) => Promise<ActionState | void>,
) {
  return async (_prev: ActionState, form: FormData): Promise<ActionState> => {
    let user: CurrentUser;
    try {
      user = await assertRole(minRole);
    } catch (e) {
      if (e instanceof AuthError) return { ok: false, message: e.message };
      throw e;
    }
    const parsed = schema.safeParse(formToObject(form));
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
      return { ok: false, message: "Please fix the highlighted fields.", errors };
    }
    try {
      return (await run(parsed.data, user, form)) ?? { ok: true, message: "Saved." };
    } catch (e) {
      if (e instanceof UserFacingError || e instanceof AiGenerationError || e instanceof AiUnavailableError) {
        return { ok: false, message: e.message };
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: false, message: "A record with these details already exists." };
      }
      throw e;
    }
  };
}
