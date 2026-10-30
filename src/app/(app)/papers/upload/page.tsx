import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getUniversityOptions } from "@/lib/papers/options";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload question paper" };
export const maxDuration = 300;

export default async function UploadPage() {
  const user = await requireUser();
  const [universities, reg] = await Promise.all([
    getUniversityOptions(),
    user.regulationId ? db.regulation.findUnique({ where: { id: user.regulationId }, select: { id: true, universityId: true } }) : null,
  ]);
  return (
    <>
      <PageHeader
        title="Upload a previous-year question paper"
        description="Uploaded papers stay unverified until faculty confirm them against an official source or the college exam cell. Only verified papers count toward repetition statistics."
      />
      <div className="card max-w-3xl">
        <UploadForm universities={universities} maxMb={env.MAX_UPLOAD_MB} defaults={{ universityId: reg?.universityId, regulationId: reg?.id }} />
      </div>
    </>
  );
}
