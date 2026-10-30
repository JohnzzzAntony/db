import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { readSession } from "./session";

/** Data Access Layer: the single place that turns a cookie into a user. */
export const getCurrentUser = cache(async () => {
  const userId = await readSession();
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      institutionId: true,
      regulationId: true,
      academicYearId: true,
    },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const RANK: Record<Role, number> = { STUDENT: 0, FACULTY: 1, ADMIN: 2 };

export function hasRole(user: Pick<CurrentUser, "role">, min: Role) {
  return RANK[user.role] >= RANK[min];
}

/** Redirects pages; use `assertRole` inside server actions and route handlers. */
export async function requireRole(min: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user, min)) redirect("/dashboard?denied=1");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Not signed in" : "Not allowed");
  }
}

export async function assertRole(min: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (!hasRole(user, min)) throw new AuthError(403);
  return user;
}
