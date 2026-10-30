import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { Badge, VerificationBadge } from "@/components/badges";
import { SUBJECT_CATEGORY_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireUser();
  if (!user.regulationId) {
    return (
      <>
        <PageHeader title="Subjects" />
        <p className="card text-sm">Choose your university and regulation on the <Link className="link" href="/dashboard">dashboard</Link> first.</p>
      </>
    );
  }
  const regulation = await db.regulation.findUniqueOrThrow({
    where: { id: user.regulationId },
    include: {
      university: true,
      academicYears: {
        orderBy: { number: "asc" },
        include: {
          subjects: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            include: { _count: { select: { units: true, papers: true } } },
          },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Subjects"
        description={
          <>
            {regulation.university.name} — {regulation.name}. <VerificationBadge status={regulation.verificationStatus} />
          </>
        }
      />
      <div className="space-y-8">
        {regulation.academicYears
          .filter((y) => !user.academicYearId || y.id === user.academicYearId)
          .map((year) => (
            <section key={year.id} aria-labelledby={`y-${year.id}`}>
              <h2 id={`y-${year.id}`} className="mb-3 font-serif text-xl font-semibold">{year.label}</h2>
              {year.subjects.length ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {year.subjects.map((s) => (
                    <li key={s.id}>
                      <Link href={`/subjects/${s.id}`} className="card block h-full transition hover:border-brand">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{s.name}</h3>
                          {s.code ? <Badge>{s.code}</Badge> : null}
                        </div>
                        <p className="text-xs text-muted">{SUBJECT_CATEGORY_LABELS[s.category]}</p>
                        <p className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Badge>{s._count.units} units</Badge>
                          <Badge>{s._count.papers} papers</Badge>
                          <VerificationBadge status={s.verificationStatus} />
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No subjects configured for this year.</p>
              )}
            </section>
          ))}
      </div>
    </>
  );
}
