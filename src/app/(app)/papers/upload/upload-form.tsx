"use client";

import { FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { PaperMetaFields, type UniversityOption } from "@/components/paper-meta-fields";
import { uploadPaper } from "../actions";

export function UploadForm({ universities, maxMb, defaults }: { universities: UniversityOption[]; maxMb: number; defaults: { universityId?: string; regulationId?: string } }) {
  const { state, pending, formProps } = useFormAction(uploadPaper);
  return (
    <form {...formProps} className="space-y-5">
      <div>
        <label htmlFor="file" className="label">Question paper file *</label>
        <input id="file" name="file" type="file" required accept="application/pdf,image/png,image/jpeg,image/webp" className="input file:mr-3 file:rounded file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-brand-strong" />
        <p className="mt-1 text-xs text-muted">PDF or photo (PNG/JPEG/WebP), up to {maxMb} MB. Scanned papers are fine — the AI reads them directly.</p>
      </div>
      <PaperMetaFields universities={universities} state={state} defaults={defaults} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Uploading and extracting questions…">Upload paper</SubmitButton>
    </form>
  );
}
