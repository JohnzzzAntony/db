import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { aiEnabled } from "@/lib/ai/client";
import { UserFacingError } from "@/lib/actions";
import type { ExamType, PaperOrigin } from "@/generated/prisma/enums";
import { sniffFileType } from "./file-type";
import { processPaper } from "./extract";

export type PaperMeta = {
  universityId: string;
  regulationId?: string;
  subjectId?: string;
  subjectNameRaw?: string;
  subjectCode?: string;
  yearOfStudy?: string;
  examMonth?: number;
  examYear?: number;
  examType: ExamType;
  sourceUrl?: string;
};

export const maxUploadBytes = () => env.MAX_UPLOAD_MB * 1024 * 1024;

/** Stores a paper file (deduplicated by hash) and runs AI extraction when available. */
export async function createPaper(bytes: Buffer, fileName: string, meta: PaperMeta, origin: PaperOrigin, uploadedById: string) {
  if (bytes.byteLength > maxUploadBytes()) throw new UserFacingError(`Files must be under ${env.MAX_UPLOAD_MB} MB.`);
  const mimeType = sniffFileType(bytes);
  if (!mimeType) throw new UserFacingError("Only PDF, PNG, JPEG or WebP question papers are supported.");

  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const existing = await db.questionPaper.findUnique({ where: { fileHash }, select: { id: true } });
  if (existing) throw new UserFacingError("This exact file is already in the library.");

  if (meta.subjectId) {
    const subject = await db.subject.findUnique({
      where: { id: meta.subjectId },
      select: { name: true, code: true, academicYear: { select: { regulation: { select: { universityId: true } } } } },
    });
    if (!subject || subject.academicYear.regulation.universityId !== meta.universityId) {
      throw new UserFacingError("The selected subject does not belong to that university.");
    }
    meta.subjectNameRaw ??= subject.name;
    meta.subjectCode ??= subject.code ?? undefined;
  }

  const regulation = meta.regulationId ? await db.regulation.findUnique({ where: { id: meta.regulationId } }) : null;
  const paper = await db.questionPaper.create({
    data: {
      ...meta,
      course: regulation?.course ?? "Post Basic B.Sc. Nursing",
      origin,
      fileName: fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "paper",
      mimeType,
      fileSize: bytes.byteLength,
      fileData: new Uint8Array(bytes),
      fileHash,
      uploadedById,
    },
  });

  if (aiEnabled()) {
    // Failures are recorded on the paper; the upload itself still succeeds.
    await processPaper(paper.id).catch((e) => console.error("extraction failed", paper.id, e));
  }
  return paper;
}
