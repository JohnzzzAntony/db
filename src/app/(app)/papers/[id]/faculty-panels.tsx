"use client";

import { FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { PaperMetaFields, type PaperMetaDefaults, type UniversityOption } from "@/components/paper-meta-fields";
import { updatePaperMetadata, verifyPaper } from "../actions";

export function VerifyPanel({ paperId, status, note }: { paperId: string; status: string; note: string | null }) {
  const { state, pending, formProps } = useFormAction(verifyPaper);
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="paperId" value={paperId} />
      <div>
        <label htmlFor="status" className="label">Verification status</label>
        <select id="status" name="status" className="input" defaultValue={status}>
          <option value="VERIFIED">Verified — matches an official paper</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="REJECTED">Rejected — not genuine / wrong paper</option>
        </select>
      </div>
      <div>
        <label htmlFor="note" className="label">How was it verified?</label>
        <textarea id="note" name="note" rows={2} className="input" defaultValue={note ?? ""} placeholder="e.g. Matched RGUHS website copy; exam cell original" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save verification</SubmitButton>
    </form>
  );
}

export function MetadataPanel({ paperId, universities, defaults }: { paperId: string; universities: UniversityOption[]; defaults: PaperMetaDefaults }) {
  const { state, pending, formProps } = useFormAction(updatePaperMetadata);
  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="paperId" value={paperId} />
      <PaperMetaFields universities={universities} defaults={defaults} state={state} />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save details</SubmitButton>
    </form>
  );
}
