import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { Badge, VerificationBadge } from "@/components/badges";
import { examSession, SUBJECT_CATEGORY_LABELS } from "@/lib/labels";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  return db.subject.findUnique({
    where: { id },
    include: {
      academicYear: { include: { regulation: { include: { university: true } } } },
      units: { orderBy: { number: "asc" }, include: { topics: { orderBy: { sortOrder: "asc" } } } },
      textbooks: true,
      papers: {
        where: { verificationStatus: { not: "REJECTED" } },
        orderBy: [{ examYear: "desc" }, { examMonth: "desc" }],
        select: { id: true, examYear: true, examMonth: true, examType: true, verificationStatus: true, _count: { select: { questions: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await db.subject.findUnique({ where: { id: (await params).id }, select: { name: true } });
  return { title: s?.name ?? "Subject" };
}

export default async function SubjectPage({ params }: Props) {
  const user = await requireUser();
  const subject = await load((await params).id);
  if (!subject) notFound();
  const marks = [
    ["Theory", subject.theoryMarks],
    ["Theory internal", subject.theoryInternal],
    ["Practical", subject.practicalMarks],
    ["Practical internal", subject.practicalInternal],
  ] as const;

  return (
    <>
      <PageHeader
        title={subject.name}
        description={
          <>
            {SUBJECT_CATEGORY_LABELS[subject.category]} · {subject.academicYear.label} · {subject.academicYear.regulation.university.shortName ?? subject.academicYear.regulation.university.name}{" "}
            <VerificationBadge status={subject.verificationStatus} />
          </>
        }
        actions={
          <>
            <Link href={`/study?subjectId=${subject.id}`} className="btn">Generate study material</Link>
            {hasRole(user, "FACULTY") ? <Link href={`/admin/subjects/${subject.id}`} className="btn-secondary">Edit</Link> : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="mb-2 font-semibold">Overview</h2>
            <p className="whitespace-pre-line text-sm">{subject.overview ?? "No overview has been added yet."}</p>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Syllabus units</h2>
            {subject.units.length ? (
              <ol className="space-y-4">
                {subject.units.map((u) => (
                  <li key={u.id}>
                    <h3 className="text-sm font-semibold">
                      Unit {u.number}: {u.title} {u.hours ? <span className="font-normal text-muted">({u.hours} h)</span> : null}
                    </h3>
                    {u.topics.length ? (
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {u.topics.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={`/study?subjectId=${subject.id}&topic=${encodeURIComponent(t.title)}`}
                              className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-brand hover:text-brand"
                            >
                              {t.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Units have not been entered for this subject. Faculty can add them from the admin panel.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Examination scheme</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {marks.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium">{v ?? "Not set"}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card">
            <h2 className="mb-3 font-semibold">Recommended textbooks</h2>
            {subject.textbooks.length ? (
              <ul className="space-y-2 text-sm">
                {subject.textbooks.map((t) => (
                  <li key={t.id}>
                    <span className="font-medium">{t.title}</span> — {t.authors}
                    {t.edition ? `, ${t.edition} ed.` : ""}
                    {t.publisher ? `, ${t.publisher}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">None added yet.</p>
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 font-semibold">Previous-year papers</h2>
            {subject.papers.length ? (
              <ul className="space-y-2 text-sm">
                {subject.papers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/papers/${p.id}`} className="link">{examSession(p.examMonth, p.examYear)}</Link>
                    <span className="flex gap-1">
                      <Badge>{p._count.questions} Q</Badge>
                      <VerificationBadge status={p.verificationStatus} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No papers linked yet.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
