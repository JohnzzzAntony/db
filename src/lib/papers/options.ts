import "server-only";
import { db } from "@/lib/db";
import type { UniversityOption } from "@/components/paper-meta-fields";

export async function getUniversityOptions(): Promise<UniversityOption[]> {
  const universities = await db.university.findMany({
    where: { verificationStatus: { not: "REJECTED" } },
    orderBy: { name: "asc" },
    include: {
      regulations: {
        orderBy: { name: "asc" },
        include: {
          academicYears: {
            orderBy: { number: "asc" },
            include: { subjects: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    regulations: u.regulations.map((r) => ({
      id: r.id,
      name: r.name,
      subjects: r.academicYears.flatMap((y) => y.subjects.map((s) => ({ id: s.id, label: `${s.name} (${y.label})` }))),
    })),
  }));
}
