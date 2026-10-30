import "server-only";
import { db } from "@/lib/db";
import { findBestMatch, normalizeQuestion } from "./similarity";

export function subjectKeyFor(paper: { subjectId: string | null; subjectNameRaw: string | null }) {
  if (paper.subjectId) return `subject:${paper.subjectId}`;
  return `raw:${normalizeQuestion(paper.subjectNameRaw ?? "unknown subject") || "unknown"}`;
}

/**
 * Groups a paper's questions with matching questions from other papers of the same
 * university and subject. Questions from the same paper never merge with each other.
 */
export async function assignClusters(paperId: string) {
  const paper = await db.questionPaper.findUniqueOrThrow({
    where: { id: paperId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  const subjectKey = subjectKeyFor(paper);

  // Detach first so re-extraction doesn't leave stale memberships behind.
  await db.question.updateMany({ where: { paperId }, data: { clusterId: null } });
  await db.questionCluster.deleteMany({ where: { questions: { none: {} } } });

  const clusters = await db.questionCluster.findMany({
    where: { universityId: paper.universityId, subjectKey },
    include: { questions: { select: { normalizedText: true } } },
  });
  const pool = clusters.map((c) => ({ id: c.id, members: c.questions.map((q) => q.normalizedText) }));
  const usedThisPaper = new Set<string>();

  for (const q of paper.questions) {
    const normalized = normalizeQuestion(q.text);
    const eligible = pool.filter((c) => !usedThisPaper.has(c.id));
    const idx = findBestMatch(normalized, eligible.map((c) => c.members));
    let clusterId: string;
    if (idx >= 0) {
      clusterId = eligible[idx].id;
      eligible[idx].members.push(normalized);
    } else {
      const created = await db.questionCluster.create({
        data: {
          universityId: paper.universityId,
          subjectId: paper.subjectId,
          subjectKey,
          canonicalText: q.text,
          topic: q.topic,
        },
      });
      clusterId = created.id;
      pool.push({ id: clusterId, members: [normalized] });
    }
    usedThisPaper.add(clusterId);
    await db.question.update({ where: { id: q.id }, data: { normalizedText: normalized, clusterId } });
  }
}
