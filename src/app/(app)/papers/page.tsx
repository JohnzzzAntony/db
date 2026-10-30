import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { Badge, VerificationBadge } from "@/components/badges";
import { EXAM_TYPE_LABELS, examSession } from "@/lib/labels";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Question Papers" };

type SP = { universityId?: string; subjectId?: string; year?: string; examType?: string; status?: string; q?: string };

export default async function PapersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;
  const where: Prisma.QuestionPaperWhereInput = {
    ...(sp.universityId ? { universityId: sp.universityId } : {}),
    ...(sp.subjectId ? { subjectId: sp.subjectId } : {}),
    ...(year ? { examYear: year } : {}),
    ...(sp.examType === "REGULAR" || sp.examType === "SUPPLEMENTARY" ? { examType: sp.examType } : {}),
    ...(sp.status === "VERIFIED" || sp.status === "UNVERIFIED" ? { verificationStatus: sp.status } : { verificationStatus: { not: "REJECTED" } }),
    ...(sp.q
      ? {
          OR: [
            { subjectNameRaw: { contains: sp.q, mode: "insensitive" } },
            { subjectCode: { contains: sp.q, mode: "insensitive" } },
            { questions: { some: { text: { contains: sp.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [papers, universities, subjects] = await Promise.all([
    db.questionPaper.findMany({
      where,
      orderBy: [{ examYear: "desc" }, { examMonth: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true, examYear: true, examMonth: true, examType: true, subjectNameRaw: true, subjectCode: true,
        verificationStatus: true, extractionStatus: true,
        university: { select: { shortName: true, name: true } },
        subject: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    }),
    db.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, academicYear: { select: { label: true } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Previous-year question papers"
        description="Search the college's paper archive. Filters combine; text search matches subject names, codes and question wording."
        actions={<Link href="/papers/upload" className="btn">Upload paper</Link>}
      />
      <form className="card mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search questions…" aria-label="Search" className="input lg:col-span-2" />
        <select name="universityId" defaultValue={sp.universityId ?? ""} aria-label="University" className="input">
          <option value="">All universities</option>
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select name="subjectId" defaultValue={sp.subjectId ?? ""} aria-label="Subject" className="input">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.academicYear.label})</option>)}
        </select>
        <input name="year" defaultValue={sp.year} placeholder="Year" inputMode="numeric" aria-label="Exam year" className="input" />
        <div className="flex gap-2">
          <select name="status" defaultValue={sp.status ?? ""} aria-label="Verification" className="input">
            <option value="">Any status</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </div>
      </form>

      {papers.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr><th>Session</th><th>Subject</th><th>University</th><th>Exam</th><th>Questions</th><th>Status</th></tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/papers/${p.id}`} className="link">{examSession(p.examMonth, p.examYear)}</Link></td>
                  <td>{p.subject?.name ?? p.subjectNameRaw ?? "—"}{p.subjectCode ? <span className="text-muted"> · {p.subjectCode}</span> : null}</td>
                  <td>{p.university.shortName ?? p.university.name}</td>
                  <td>{EXAM_TYPE_LABELS[p.examType]}</td>
                  <td>
                    {p.extractionStatus === "DONE" ? p._count.questions : <Badge variant={p.extractionStatus === "FAILED" ? "danger" : "muted"}>{p.extractionStatus.toLowerCase()}</Badge>}
                  </td>
                  <td><VerificationBadge status={p.verificationStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card text-sm text-muted">No papers match. Upload one you have, or ask faculty to import papers from the university website.</p>
      )}
    </>
  );
}
