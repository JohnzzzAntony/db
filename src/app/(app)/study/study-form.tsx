"use client";

import { FieldError, FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { MARKS_OPTIONS, MODE_LABELS, STUDY_MODES } from "@/lib/study/plan";
import { generateStudy } from "./actions";

const MODE_HELP: Record<(typeof STUDY_MODES)[number], string> = {
  UNIVERSITY_EXAM: "Model answer to write in the exam",
  QUICK_REVISION: "Key points, keywords, memory aids",
  DETAILED_RESEARCH: "In-depth, all sections, with sources",
  VIVA: "Oral exam questions and answers",
};

export function StudyForm({ subjects, defaults }: { subjects: { id: string; label: string }[]; defaults: { topic?: string; subjectId?: string } }) {
  const { state, pending, formProps } = useFormAction(generateStudy);
  return (
    <form {...formProps} className="space-y-5">
      <div>
        <label htmlFor="topic" className="label">Topic</label>
        <input id="topic" name="topic" className="input" placeholder="e.g. Congestive Heart Failure" defaultValue={defaults.topic} required maxLength={200} aria-describedby="topic-error" />
        <FieldError state={state} name="topic" />
      </div>
      <div>
        <label htmlFor="subjectId" className="label">Subject <span className="font-normal text-muted">(optional, improves sources)</span></label>
        <select id="subjectId" name="subjectId" className="input" defaultValue={defaults.subjectId ?? ""}>
          <option value="">Any subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="label">Mode</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {STUDY_MODES.map((m, i) => (
            <label key={m} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="mode" value={m} defaultChecked={i === 0} className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-medium">{MODE_LABELS[m]}</span>
                <span className="block text-xs text-muted">{MODE_HELP[m]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Answer length</legend>
        <div className="flex flex-wrap gap-2">
          {MARKS_OPTIONS.map((m) => (
            <label key={m} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:font-semibold">
              <input type="radio" name="marks" value={m} defaultChecked={m === 10} className="sr-only" />
              {m} marks
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Researching and writing… this can take a minute or two">Generate</SubmitButton>
    </form>
  );
}
