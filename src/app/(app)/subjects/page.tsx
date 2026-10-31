import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SUBJECTS } from "@/lib/data/subjects";
import { PDF_PAPERS } from "@/lib/data/papers";

export const metadata: Metadata = { title: "Subjects" };

export default function SubjectsPage() {
  return (
    <>
      <PageHeader title="Subjects" description="Post Basic B.Sc. Nursing subjects by year. Confirm the list against your university's current syllabus." />
      <div className="space-y-8">
        {[1, 2].map((year) => (
          <section key={year} aria-labelledby={`y${year}`}>
            <h2 id={`y${year}`} className="mb-3 font-serif text-xl font-semibold">{year === 1 ? "First year" : "Second year"}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUBJECTS.filter((s) => s.year === year).map((s) => (
                <li key={s.name} className="card flex flex-col gap-3">
                  <h3 className="font-semibold">{s.name}</h3>
                  <div className="mt-auto flex flex-wrap gap-2 text-sm">
                    <Link href={`/study?subject=${encodeURIComponent(s.name)}`} className="btn px-3 py-1.5">Study a topic</Link>
                    <Link href={`/papers?subject=${encodeURIComponent(s.name)}`} className="btn-secondary px-3 py-1.5">
                      Question papers{PDF_PAPERS[s.name]?.length ? ` (${PDF_PAPERS[s.name]!.length} PDF)` : ""}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
