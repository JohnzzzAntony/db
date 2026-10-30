import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { REQUIREMENT_GROUP_LABELS, SUBJECT_CATEGORY_LABELS } from "@/lib/labels";
import { deleteRequirement, saveInstitution, saveRequirement } from "../actions";

export const metadata: Metadata = { title: "Clinical requirements" };

const CATEGORY_OPTIONS = Object.entries(SUBJECT_CATEGORY_LABELS) as [string, string][];
const GROUP_OPTIONS = Object.entries(REQUIREMENT_GROUP_LABELS) as [string, string][];

export default async function RequirementsPage() {
  await requireRole("ADMIN");
  const [institutions, regulations] = await Promise.all([
    db.institution.findMany({
      orderBy: { name: "asc" },
      include: { clinicalRequirements: { orderBy: [{ subjectCategory: "asc" }, { sortOrder: "asc" }] } },
    }),
    db.regulation.findMany({ include: { university: true }, orderBy: { name: "asc" } }),
  ]);
  const regOptions: [string, string][] = [["", "Not set"], ...regulations.map((r) => [r.id, `${r.university.shortName ?? r.university.name} — ${r.name}`] as [string, string])];
  const uniOptions: [string, string][] = [["", "Not set"], ...[...new Map(regulations.map((r) => [r.universityId, r.university.name])).entries()]];

  return (
    <>
      <PageHeader title="Institution & clinical requirements" description="Requirements were transcribed from the college's requirement sheet. Update them whenever the college revises its clinical record requirements." />
      {institutions.map((inst) => (
        <div key={inst.id} className="space-y-6">
          <section className="card" aria-labelledby={`i-${inst.id}`}>
            <h2 id={`i-${inst.id}`} className="mb-3 font-serif text-xl font-semibold">{inst.name}</h2>
            <ActionForm action={saveInstitution}>
              <input type="hidden" name="id" value={inst.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField name="name" label="Name" defaultValue={inst.name} required />
                <TextField name="city" label="City" defaultValue={inst.city ?? ""} />
                <SelectField name="universityId" label="Affiliated university" options={uniOptions} defaultValue={inst.universityId ?? ""} />
                <SelectField name="regulationId" label="Default regulation for new students" options={regOptions} defaultValue={inst.regulationId ?? ""} />
                <TextArea name="affiliationNote" label="How the affiliation was confirmed" defaultValue={inst.affiliationNote ?? ""} className="sm:col-span-2" />
              </div>
            </ActionForm>
          </section>

          <section className="card overflow-x-auto" aria-labelledby={`r-${inst.id}`}>
            <h2 id={`r-${inst.id}`} className="mb-3 font-semibold">Requirements ({inst.clinicalRequirements.length})</h2>
            <table className="table">
              <thead><tr><th>Subject area</th><th>Type</th><th>Requirement</th><th>Qty</th><th>Source</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {inst.clinicalRequirements.map((r) => (
                  <tr key={r.id}>
                    <td>{SUBJECT_CATEGORY_LABELS[r.subjectCategory]}</td>
                    <td>{REQUIREMENT_GROUP_LABELS[r.group]}</td>
                    <td>{r.title}{r.notes ? <span className="block text-xs text-muted">{r.notes}</span> : null}</td>
                    <td>{r.quantity} {r.quantityUnit ?? ""}</td>
                    <td className="text-xs text-muted">{r.source ?? "—"}</td>
                    <td><form action={deleteRequirement.bind(null, r.id)}><button className="btn-danger" aria-label={`Delete ${r.title}`}>Delete</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="mb-2 mt-6 text-sm font-semibold">Add requirement</h3>
            <ActionForm action={saveRequirement} submitLabel="Add requirement" resetOnSuccess>
              <input type="hidden" name="institutionId" value={inst.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField name="subjectCategory" label="Subject area" options={CATEGORY_OPTIONS} />
                <SelectField name="group" label="Type" options={GROUP_OPTIONS} />
                <TextField name="title" label="Requirement *" required />
                <TextField name="quantity" label="Quantity" type="number" min={1} defaultValue={1} />
                <TextField name="quantityUnit" label="Unit (e.g. surgeries)" />
                <TextField name="source" label="Source" defaultValue="Koshys College of Nursing clinical requirement sheet" />
                <TextArea name="notes" label="Notes" className="sm:col-span-3" />
              </div>
            </ActionForm>
          </section>
        </div>
      ))}
    </>
  );
}
