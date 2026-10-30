import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { aiEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/page-header";
import { MODE_LABELS } from "@/lib/study/plan";
import { StudyForm } from "./study-form";

export const metadata: Metadata = { title: "Study Generator" };
// Generation runs inside this page's server action and can take a few minutes.
export const maxDuration = 300;

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ topic?: string; subjectId?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [subjects, history] = await Promise.all([
    db.subject.findMany({
      where: user.regulationId
        ? { academicYear: { regulationId: user.regulationId, ...(user.academicYearId ? { id: user.academicYearId } : {}) } }
        : {},
      orderBy: [{ academicYear: { number: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, academicYear: { select: { label: true } } },
    }),
    db.studyDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, topic: true, mode: true, marks: true, createdAt: true, subject: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="AI Study Material Generator"
        description="Answers are grounded in the college's verified reference library. Every section shows whether it is source-supported, standard textbook content, or needs verification."
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3" aria-label="Generate">
          {aiEnabled() ? (
            <StudyForm subjects={subjects.map((s) => ({ id: s.id, label: `${s.name} (${s.academicYear.label})` }))} defaults={sp} />
          ) : (
            <p className="text-sm text-muted">AI generation is not configured on this server.</p>
          )}
        </section>
        <section className="card lg:col-span-2" aria-labelledby="hist">
          <h2 id="hist" className="mb-3 font-semibold">Your documents</h2>
          {history.length ? (
            <ul className="divide-y divide-border text-sm">
              {history.map((d) => (
                <li key={d.id} className="py-2">
                  <Link href={`/study/${d.id}`} className="link">{d.topic}</Link>
                  <p className="text-xs text-muted">
                    {MODE_LABELS[d.mode]} · {d.marks} marks{d.subject ? ` · ${d.subject.name}` : ""} · {d.createdAt.toLocaleDateString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Generated documents appear here.</p>
          )}
        </section>
      </div>
    </>
  );
}
