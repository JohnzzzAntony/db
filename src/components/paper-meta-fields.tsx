"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/actions";
import { FieldError } from "./forms";

export type UniversityOption = {
  id: string;
  name: string;
  regulations: { id: string; name: string; subjects: { id: string; label: string }[] }[];
};

export type PaperMetaDefaults = Partial<{
  universityId: string;
  regulationId: string | null;
  subjectId: string | null;
  subjectNameRaw: string | null;
  subjectCode: string | null;
  yearOfStudy: string | null;
  examMonth: number | null;
  examYear: number | null;
  examType: string;
  sourceUrl: string | null;
}>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Shared university → regulation → subject cascade plus exam session fields. */
export function PaperMetaFields({ universities, defaults = {}, state }: { universities: UniversityOption[]; defaults?: PaperMetaDefaults; state: ActionState }) {
  const [uni, setUni] = useState(defaults.universityId ?? universities[0]?.id ?? "");
  const regs = universities.find((u) => u.id === uni)?.regulations ?? [];
  const [reg, setReg] = useState(defaults.regulationId ?? regs[0]?.id ?? "");
  const subjects = regs.find((r) => r.id === reg)?.subjects ?? [];
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="universityId" className="label">University *</label>
        <select
          id="universityId"
          name="universityId"
          className="input"
          value={uni}
          onChange={(e) => {
            setUni(e.target.value);
            setReg(universities.find((u) => u.id === e.target.value)?.regulations[0]?.id ?? "");
          }}
          required
        >
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <FieldError state={state} name="universityId" />
      </div>
      <div>
        <label htmlFor="regulationId" className="label">Regulation</label>
        <select id="regulationId" name="regulationId" className="input" value={reg} onChange={(e) => setReg(e.target.value)}>
          <option value="">Not sure</option>
          {regs.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="subjectId" className="label">Subject (configured)</label>
        <select id="subjectId" name="subjectId" className="input" defaultValue={v(defaults.subjectId)} key={reg}>
          <option value="">Not listed / let AI read it</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="subjectNameRaw" className="label">Subject as printed on paper</label>
        <input id="subjectNameRaw" name="subjectNameRaw" className="input" defaultValue={v(defaults.subjectNameRaw)} maxLength={200} />
      </div>
      <div>
        <label htmlFor="subjectCode" className="label">Subject code</label>
        <input id="subjectCode" name="subjectCode" className="input" defaultValue={v(defaults.subjectCode)} maxLength={40} />
      </div>
      <div>
        <label htmlFor="yearOfStudy" className="label">Year of study</label>
        <input id="yearOfStudy" name="yearOfStudy" className="input" placeholder="First Year" defaultValue={v(defaults.yearOfStudy)} maxLength={40} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="examMonth" className="label">Exam month</label>
          <select id="examMonth" name="examMonth" className="input" defaultValue={v(defaults.examMonth)}>
            <option value="">Unknown</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="examYear" className="label">Exam year</label>
          <input id="examYear" name="examYear" type="number" inputMode="numeric" min={1990} max={2100} className="input" defaultValue={v(defaults.examYear)} />
          <FieldError state={state} name="examYear" />
        </div>
      </div>
      <div>
        <label htmlFor="examType" className="label">Examination</label>
        <select id="examType" name="examType" className="input" defaultValue={defaults.examType ?? "UNKNOWN"}>
          <option value="UNKNOWN">Not stated</option>
          <option value="REGULAR">Regular</option>
          <option value="SUPPLEMENTARY">Supplementary</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="sourceUrl" className="label">Source URL (official page where the paper is published)</label>
        <input id="sourceUrl" name="sourceUrl" type="url" className="input" defaultValue={v(defaults.sourceUrl)} placeholder="https://" />
        <FieldError state={state} name="sourceUrl" />
      </div>
    </div>
  );
}
