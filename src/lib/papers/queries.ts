import "server-only";
import { db } from "@/lib/db";
import type { QuestionType } from "@/generated/prisma/enums";
import { analyzeCluster, type ClusterStats, type ScopePaper } from "./analysis";
import { subjectKeyFor } from "./cluster";

export type SubjectScope = { key: string; label: string; paperCount: number };

/** Subjects that have papers for a university, keyed the same way clusters are. */
export async function listSubjectScopes(universityId: string): Promise<SubjectScope[]> {
  const papers = await db.questionPaper.findMany({
    where: { universityId, verificationStatus: { not: "REJECTED" } },
    select: { subjectId: true, subjectNameRaw: true, subject: { select: { name: true } } },
  });
  const map = new Map<string, SubjectScope>();
  for (const p of papers) {
    const key = subjectKeyFor(p);
    const entry = map.get(key) ?? { key, label: p.subject?.name ?? p.subjectNameRaw ?? "Unknown subject", paperCount: 0 };
    entry.paperCount++;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export type RepeatedQuestion = {
  clusterId: string;
  canonicalText: string;
  topic: string | null;
  types: QuestionType[];
  stats: ClusterStats;
  appearances: {
    paperId: string;
    questionText: string;
    examYear: number | null;
    examMonth: number | null;
    examType: string;
    marks: number | null;
    verification: string;
    sourceUrl: string | null;
  }[];
};

export async function getRepeatedQuestions(opts: {
  universityId: string;
  subjectKey: string;
  type?: QuestionType;
}): Promise<RepeatedQuestion[]> {
  const [clusters, papers] = await Promise.all([
    db.questionCluster.findMany({
      where: {
        universityId: opts.universityId,
        subjectKey: opts.subjectKey,
        ...(opts.type ? { questions: { some: { type: opts.type } } } : {}),
      },
      include: {
        questions: {
          include: {
            paper: {
              select: {
                id: true,
                examYear: true,
                examMonth: true,
                examType: true,
                verificationStatus: true,
                sourceUrl: true,
              },
            },
          },
        },
      },
    }),
    db.questionPaper.findMany({
      where: { universityId: opts.universityId },
      select: { examYear: true, verificationStatus: true, subjectId: true, subjectNameRaw: true },
    }),
  ]);

  const scopePapers: ScopePaper[] = papers
    .filter((p) => subjectKeyFor(p) === opts.subjectKey)
    .map((p) => ({ examYear: p.examYear, verification: p.verificationStatus }));

  return clusters
    .map((c) => {
      const appearances = c.questions.map((q) => ({
        paperId: q.paper.id,
        examYear: q.paper.examYear,
        examMonth: q.paper.examMonth,
        examType: q.paper.examType,
        verification: q.paper.verificationStatus,
        marks: q.marks,
        text: q.text,
        normalizedText: q.normalizedText,
        sourceUrl: q.paper.sourceUrl,
      }));
      return {
        clusterId: c.id,
        canonicalText: c.canonicalText,
        topic: c.topic,
        types: [...new Set(c.questions.map((q) => q.type))],
        stats: analyzeCluster(appearances, scopePapers),
        appearances: appearances
          .map((a) => ({ ...a, questionText: a.text }))
          .sort((a, b) => (b.examYear ?? 0) - (a.examYear ?? 0)),
      };
    })
    .filter((r) => r.stats.totalAppearances > 0)
    .sort(
      (a, b) =>
        b.stats.verifiedAppearances - a.stats.verifiedAppearances ||
        b.stats.totalAppearances - a.stats.totalAppearances ||
        (b.stats.lastSeenYear ?? 0) - (a.stats.lastSeenYear ?? 0),
    );
}
