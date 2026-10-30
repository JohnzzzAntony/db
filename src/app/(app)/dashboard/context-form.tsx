"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { updateAcademicContext } from "./actions";

type Regulation = { id: string; label: string; years: { id: string; label: string }[] };

export function ContextForm({ regulations, regulationId, academicYearId }: { regulations: Regulation[]; regulationId: string | null; academicYearId: string | null }) {
  const { state, pending, formProps } = useFormAction(updateAcademicContext);
  const [reg, setReg] = useState(regulationId ?? regulations[0]?.id ?? "");
  const years = regulations.find((r) => r.id === reg)?.years ?? [];
  return (
    <form {...formProps} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="regulationId" className="label">University &amp; regulation</label>
        <select id="regulationId" name="regulationId" className="input" value={reg} onChange={(e) => setReg(e.target.value)}>
          {regulations.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="academicYearId" className="label">Year</label>
        <select id="academicYearId" name="academicYearId" className="input" defaultValue={academicYearId ?? ""} key={reg}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
      </div>
      <SubmitButton pending={pending}>Save</SubmitButton>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}
