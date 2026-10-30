import "server-only";
import { db } from "@/lib/db";
import { AiGenerationError, generateStructured } from "@/lib/ai/client";
import { paperExtractionSchema } from "./extraction-schema";
import { assignClusters } from "./cluster";

const SYSTEM = `You transcribe Indian nursing university examination question papers into structured data.

Rules:
- Transcribe questions exactly as printed. Never add, merge, complete or invent questions.
- Split sub-questions (a, b, i, ii) into separate entries only when they carry separate marks or are separately answerable; keep the parent stem in each sub-question's text so it stands alone.
- Read marks from the paper (per question or from section headings such as "Long essays 2 x 15 = 30"). Use null when not stated.
- Classify type from the section heading and marks: long essay (typically 10-20 marks), short essay (5-8), short answer (2-5), very short answer (1-2), MCQ, fill in the blank, case-based.
- Metadata (university, subject, month, year, exam type) must come from what is printed. Use null / UNKNOWN when it is not printed. Do not guess the year from the content.
- If text is unreadable, write [illegible] in its place and mention it in notes.
- If the document is not a question paper, set isQuestionPaper to false and return no questions.`;

/** Runs AI extraction for one paper, replaces its questions and re-clusters them. */
export async function processPaper(paperId: string) {
  const paper = await db.questionPaper.findUniqueOrThrow({
    where: { id: paperId },
    include: { subject: { include: { units: { orderBy: { number: "asc" } } } } },
  });
  await db.questionPaper.update({ where: { id: paperId }, data: { extractionStatus: "PROCESSING", extractionError: null } });

  try {
    const units = paper.subject?.units ?? [];
    const unitList = units.length
      ? `Syllabus units for this subject:\n${units.map((u) => `${u.number}. ${u.title}`).join("\n")}`
      : "No syllabus units are configured; set unitNumber to null.";

    const isPdf = paper.mimeType === "application/pdf";
    const fileBlock = isPdf
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: Buffer.from(paper.fileData).toString("base64") },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: paper.mimeType as "image/png" | "image/jpeg" | "image/webp",
            data: Buffer.from(paper.fileData).toString("base64"),
          },
        } as const);

    const { data } = await generateStructured({
      schema: paperExtractionSchema,
      system: SYSTEM,
      effort: "medium",
      maxTokens: 32000,
      content: [fileBlock, { type: "text", text: `${unitList}\n\nExtract this question paper.` }],
    });

    if (!data.isQuestionPaper) throw new AiGenerationError("This file does not look like an examination question paper.");

    const unitByNumber = new Map(units.map((u) => [u.number, u.id]));
    await db.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { paperId } });
      await tx.question.createMany({
        data: data.questions.map((q, i) => ({
          paperId,
          number: q.number.slice(0, 20),
          text: q.text,
          normalizedText: "",
          marks: q.marks,
          type: q.type,
          topic: q.topic,
          unitId: q.unitNumber != null ? (unitByNumber.get(q.unitNumber) ?? null) : null,
          sortOrder: i,
        })),
      });
      // Fill human fields only where the uploader left them blank; keep the AI reading separately.
      const d = data.detected;
      await tx.questionPaper.update({
        where: { id: paperId },
        data: {
          detectedMetadata: d,
          subjectNameRaw: paper.subjectNameRaw ?? d.subjectName,
          subjectCode: paper.subjectCode ?? d.subjectCode,
          yearOfStudy: paper.yearOfStudy ?? d.yearOfStudy,
          examMonth: paper.examMonth ?? d.examMonth,
          examYear: paper.examYear ?? d.examYear,
          examType: paper.examType !== "UNKNOWN" ? paper.examType : d.examType,
          totalMarks: paper.totalMarks ?? d.totalMarks,
          durationHours: paper.durationHours ?? d.durationHours,
          extractionError: data.notes,
        },
      });
    });

    await assignClusters(paperId);
    await db.questionPaper.update({ where: { id: paperId }, data: { extractionStatus: "DONE" } });
  } catch (err) {
    const message = err instanceof AiGenerationError || err instanceof Error ? err.message : "Extraction failed";
    await db.questionPaper.update({
      where: { id: paperId },
      data: { extractionStatus: "FAILED", extractionError: message.slice(0, 500) },
    });
    throw err;
  }
}
