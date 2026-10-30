"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { formToObject, type ActionState } from "@/lib/actions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email,
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function register(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    return { ok: false, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { name, password } = parsed.data;
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return { ok: false, errors: { email: "An account with this email already exists" } };
  }
  // New students start in the institution's configured regulation; they can change it later.
  const institution = await db.institution.findFirst({ orderBy: { createdAt: "asc" } });
  const user = await db.user.create({
    data: {
      name,
      email: parsed.data.email,
      passwordHash: await hashPassword(password),
      institutionId: institution?.id,
      regulationId: institution?.regulationId,
    },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(200) });

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, message: "Incorrect email or password." };
  }
  await createSession(user.id);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
