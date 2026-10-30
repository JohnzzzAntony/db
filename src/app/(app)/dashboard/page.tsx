import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { aiEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/page-header";
import { Badge, VerificationBadge } from "@/components/badges";
import { MODE_LABELS } from "@/lib/study/plan";
import { REQUIREMENT_GROUP_LABELS, SUBJECT_CATEGORY_LABELS } from "@/lib/labels";
import { ContextForm } from "./context-form";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const current = user.regulationId
    ? await db.regulation.findUnique({ where: { id: user.regulationId }, include: { university: true } })
    : null;
  const [regulations, recent, requirements, paperCount] = await Promise.all([
    db.regulation.findMany({
      include: { university: true, academicYears: { orderBy: { number: "asc" } } },
      orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    }),
    db.studyDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, topic: true, mode: true, marks: true, createdAt: true },
    }),
    db.clinicalRequirement.findMany({
      // A user without an institution sees none rather than every college's list.
      where: { institutionId: user.institutionId ?? "__none__" },
      orderBy: { sortOrder: "asc" },
    }),
    db.questionPaper.count({
      where: { verificationStatus: "VERIFIED", ...(current ? { universityId: current.universityId } : {}) },
    }),
  ]);

  const byCategory = Object.entries(
    requirements.reduce<Record<string, typeof requirements>>((acc, r) => {
      (acc[r.subjectCategory] ??= []).push(r);
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Your academic context decides which subjects, papers and syllabus the AI uses." />
      {denied ? <p role="alert" className="mb-4 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">You don&apos;t have access to that page.</p> : null}
      {!aiEnabled() ? (
        <p className="mb-4 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          AI generation is not configured on this server (ANTHROPIC_API_KEY is missing). Browsing, papers and analysis still work.
        </p>
      ) : null}

      <section className="card mb-6" aria-labelledby="ctx">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="ctx" className="font-semibold">Academic profile</h2>
          {current ? (
            <>
              <VerificationBadge status={current.verificationStatus} />
              {current.verificationStatus !== "VERIFIED" ? (
                <span className="text-xs text-muted">Syllabus details are not yet confirmed by the college.</span>
              ) : null}
            </>
          ) : null}
        </div>
        {regulations.length ? (
          <ContextForm
            regulations={regulations.map((r) => ({
              id: r.id,
              label: `${r.university.shortName ?? r.university.name} — ${r.name}`,
              years: r.academicYears.map((y) => ({ id: y.id, label: y.label })),
            }))}
            regulationId={user.regulationId}
            academicYearId={user.academicYearId}
          />
        ) : (
          <p className="text-sm text-muted">No regulations configured yet. Ask an administrator to add one.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card" aria-labelledby="quick">
          <h2 id="quick" className="mb-3 font-semibold">Start studying</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="link" href="/study">Generate exam-ready study material</Link></li>
            <li><Link className="link" href="/papers/analysis">See repeated previous-year questions</Link></li>
            <li><Link className="link" href="/papers/upload">Upload a question paper you have</Link></li>
            <li><Link className="link" href="/subjects">Browse subjects and syllabus</Link></li>
          </ul>
          <p className="mt-4 text-xs text-muted">{paperCount} verified question paper{paperCount === 1 ? "" : "s"} in the library for your university.</p>
        </section>

        <section className="card lg:col-span-2" aria-labelledby="recent">
          <h2 id="recent" className="mb-3 font-semibold">Recent study documents</h2>
          {recent.length ? (
            <ul className="divide-y divide-border text-sm">
              {recent.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/study/${d.id}`} className="link">{d.topic}</Link>
                  <span className="text-muted">{MODE_LABELS[d.mode]} · {d.marks} marks · {d.createdAt.toLocaleDateString("en-IN")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet. Try “Congestive Heart Failure” in the study generator.</p>
          )}
        </section>
      </div>

      {byCategory.length ? (
        <section className="card mt-6" aria-labelledby="req">
          <h2 id="req" className="mb-1 font-semibold">Clinical requirements</h2>
          <p className="mb-4 text-xs text-muted">From {requirements[0]?.source ?? "college records"}. Progress tracking arrives in the clinical records module.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {byCategory.map(([cat, items]) => (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-semibold text-brand-strong">{SUBJECT_CATEGORY_LABELS[cat as keyof typeof SUBJECT_CATEGORY_LABELS]}</h3>
                <ul className="space-y-1.5 text-sm">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-2">
                      <span>{r.title}</span>
                      <Badge title={REQUIREMENT_GROUP_LABELS[r.group]}>
                        {r.quantity} {r.quantityUnit ?? ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
