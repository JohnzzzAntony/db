import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { assignClusters } from "@/lib/papers/cluster";
import { getRepeatedQuestions, listSubjectScopes } from "@/lib/papers/queries";

// Runs against DATABASE_URL; creates and removes its own university.
const enabled = Boolean(process.env.DATABASE_URL);
const NAME = `Integration Test University ${Date.now()}`;
let universityId = "";

async function paper(year: number, verification: "VERIFIED" | "UNVERIFIED", questions: [string, number][]) {
  const p = await db.questionPaper.create({
    data: {
      universityId,
      course: "Post Basic B.Sc. Nursing",
      subjectNameRaw: "Medical Surgical Nursing",
      examYear: year,
      origin: "UPLOAD",
      fileName: `${year}.pdf`,
      mimeType: "application/pdf",
      fileSize: 4,
      fileData: new Uint8Array([37, 80, 68, 70]),
      fileHash: createHash("sha256").update(NAME + year + verification).digest("hex"),
      verificationStatus: verification,
      extractionStatus: "DONE",
      questions: {
        create: questions.map(([text, marks], i) => ({ number: String(i + 1), text, normalizedText: "", marks, type: marks >= 10 ? "LONG_ESSAY" : "SHORT_ANSWER", sortOrder: i })),
      },
    },
  });
  await assignClusters(p.id);
  return p;
}

describe.runIf(enabled)("paper clustering against Postgres", () => {
  beforeAll(async () => {
    universityId = (await db.university.create({ data: { name: NAME } })).id;
    await paper(2022, "VERIFIED", [["Explain the nursing management of a patient with myocardial infarction.", 15], ["Define hypertension.", 2]]);
    await paper(2023, "VERIFIED", [["Define hypertension", 2], ["Write about peptic ulcer.", 5]]);
    await paper(2024, "VERIFIED", [["Describe the nursing management of myocardial infarction (15 marks)", 15], ["Medical management of myocardial infarction", 5]]);
    await paper(2025, "UNVERIFIED", [["Explain nursing management of myocardial infarction.", 15]]);
  });

  afterAll(async () => {
    await db.questionPaper.deleteMany({ where: { universityId } });
    await db.university.delete({ where: { id: universityId } });
    await db.$disconnect();
  });

  it("groups rewordings across papers and separates different questions", async () => {
    const [scope] = await listSubjectScopes(universityId);
    expect(scope.paperCount).toBe(4);
    const rows = await getRepeatedQuestions({ universityId, subjectKey: scope.key });
    const mi = rows.find((r) => /nursing management of a patient with myocardial/i.test(r.canonicalText))!;
    expect(mi.stats.verifiedAppearances).toBe(2);
    expect(mi.stats.totalAppearances).toBe(3);
    expect(mi.stats.labels).toEqual(["VERIFIED_PYQ", "FREQUENTLY_REPEATED"]);
    expect(mi.stats.timeline.map((t) => t.status)).toEqual(["VERIFIED", "NOT_FOUND", "VERIFIED", "UNVERIFIED"]);
    expect(rows.some((r) => /^medical management/i.test(r.canonicalText) && r.stats.verifiedAppearances === 1)).toBe(true);
    expect(rows.find((r) => /hypertension/i.test(r.canonicalText))!.stats.verifiedAppearances).toBe(2);
  });

  it("is idempotent when a paper is re-clustered", async () => {
    const ids = await db.questionPaper.findMany({ where: { universityId }, select: { id: true } });
    for (const { id } of ids) await assignClusters(id);
    const [scope] = await listSubjectScopes(universityId);
    const rows = await getRepeatedQuestions({ universityId, subjectKey: scope.key });
    expect(rows).toHaveLength(4);
    expect(await db.questionCluster.count({ where: { universityId } })).toBe(4);
  });
});
