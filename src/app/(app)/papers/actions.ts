"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { formAction, optionalUrl, UserFacingError } from "@/lib/actions";
import { assertRole } from "@/lib/auth/dal";
import { createPaper, maxUploadBytes } from "@/lib/papers/create";
import { processPaper } from "@/lib/papers/extract";
import { assignClusters } from "@/lib/papers/cluster";
import { fetchRemoteFile, RemoteFetchError } from "@/lib/papers/fetch-remote";
import { discoverPapers } from "@/lib/papers/discover";

const thisYear = new Date().getFullYear();

const metaSchema = z.object({
  universityId: z.string().min(1, "Choose a university"),
  regulationId: z.string().optional(),
  subjectId: z.string().optional(),
  subjectNameRaw: z.string().trim().max(200).optional(),
  subjectCode: z.string().trim().max(40).optional(),
  yearOfStudy: z.string().trim().max(40).optional(),
  examMonth: z.coerce.number().int().min(1).max(12).optional(),
  examYear: z.coerce.number().int().min(1990).max(thisYear + 1).optional(),
  examType: z.enum(["REGULAR", "SUPPLEMENTARY", "UNKNOWN"]).default("UNKNOWN"),
  sourceUrl: optionalUrl,
});

export const uploadPaper = formAction("STUDENT", metaSchema, async (meta, user, form) => {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Choose a file to upload.");
  if (file.size > maxUploadBytes()) throw new UserFacingError("That file is too large.");
  const paper = await createPaper(Buffer.from(await file.arrayBuffer()), file.name, meta, "UPLOAD", user.id);
  redirect(`/papers/${paper.id}`);
});

export const importPaperFromUrl = formAction(
  "FACULTY",
  metaSchema.extend({ url: z.string().trim().url("Enter a valid URL"), candidateId: z.string().optional() }),
  async ({ url, candidateId, ...meta }, user) => {
    let fetched;
    try {
      fetched = await fetchRemoteFile(url, maxUploadBytes());
    } catch (e) {
      if (e instanceof RemoteFetchError) throw new UserFacingError(e.message);
      throw new UserFacingError("Could not download that file.");
    }
    const paper = await createPaper(fetched.bytes, fetched.fileName, { ...meta, sourceUrl: meta.sourceUrl ?? fetched.finalUrl }, "URL_IMPORT", user.id);
    if (candidateId) await db.paperCandidate.updateMany({ where: { id: candidateId }, data: { imported: true } });
    redirect(`/papers/${paper.id}`);
  },
);

export const verifyPaper = formAction(
  "FACULTY",
  z.object({
    paperId: z.string().min(1),
    status: z.enum(["VERIFIED", "UNVERIFIED", "REJECTED"]),
    note: z.string().trim().max(1000).optional(),
  }),
  async ({ paperId, status, note }, user) => {
    const paper = await db.questionPaper.findUnique({ where: { id: paperId }, select: { sourceUrl: true } });
    if (!paper) throw new UserFacingError("Paper not found.");
    // A verified paper must be traceable to something: an official URL or a recorded check.
    if (status === "VERIFIED" && !paper.sourceUrl && !note) {
      throw new UserFacingError("Add a note on how you verified this paper (e.g. 'Matched college exam-cell copy'), or record a source URL.");
    }
    await db.questionPaper.update({
      where: { id: paperId },
      data: {
        verificationStatus: status,
        verificationNote: note ?? null,
        verifiedById: status === "UNVERIFIED" ? null : user.id,
        verifiedAt: status === "UNVERIFIED" ? null : new Date(),
      },
    });
    revalidatePath(`/papers/${paperId}`);
    return { ok: true, message: `Marked ${status.toLowerCase()}.` };
  },
);

export const updatePaperMetadata = formAction("FACULTY", metaSchema.extend({ paperId: z.string().min(1) }), async ({ paperId, ...meta }) => {
  const before = await db.questionPaper.findUnique({ where: { id: paperId }, select: { subjectId: true, subjectNameRaw: true, universityId: true } });
  if (!before) throw new UserFacingError("Paper not found.");
  await db.questionPaper.update({
    where: { id: paperId },
    data: {
      universityId: meta.universityId,
      regulationId: meta.regulationId ?? null,
      subjectId: meta.subjectId ?? null,
      subjectNameRaw: meta.subjectNameRaw ?? null,
      subjectCode: meta.subjectCode ?? null,
      yearOfStudy: meta.yearOfStudy ?? null,
      examMonth: meta.examMonth ?? null,
      examYear: meta.examYear ?? null,
      examType: meta.examType,
      sourceUrl: meta.sourceUrl ?? null,
    },
  });
  // Clusters are scoped by university + subject, so moving a paper means regrouping it.
  if (before.subjectId !== (meta.subjectId ?? null) || before.subjectNameRaw !== (meta.subjectNameRaw ?? null) || before.universityId !== meta.universityId) {
    await assignClusters(paperId);
  }
  revalidatePath(`/papers/${paperId}`);
  return { ok: true, message: "Details saved." };
});

export async function reprocessPaper(paperId: string) {
  await assertRole("FACULTY");
  await processPaper(paperId).catch(() => undefined); // failure is stored on the paper
  revalidatePath(`/papers/${paperId}`);
}

export async function deletePaper(paperId: string) {
  await assertRole("ADMIN");
  await db.questionPaper.delete({ where: { id: paperId } });
  await db.questionCluster.deleteMany({ where: { questions: { none: {} } } });
  redirect("/papers");
}

export const runDiscovery = formAction(
  "FACULTY",
  z.object({ universityId: z.string().min(1), query: z.string().trim().min(3).max(200) }),
  async ({ universityId, query }) => {
    const n = await discoverPapers({ universityId, query });
    revalidatePath("/admin/papers");
    return { ok: true, message: n ? `Found ${n} candidate link${n === 1 ? "" : "s"}. Review each before importing.` : "No candidate links found." };
  },
);
