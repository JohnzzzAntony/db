import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireRole("FACULTY");
  const [unverifiedPapers, failed, unverifiedSources, candidates, unverifiedConfig, users] = await Promise.all([
    db.questionPaper.count({ where: { verificationStatus: "UNVERIFIED" } }),
    db.questionPaper.count({ where: { extractionStatus: "FAILED" } }),
    db.sourceDocument.count({ where: { verificationStatus: "UNVERIFIED" } }),
    db.paperCandidate.count({ where: { imported: false } }),
    db.regulation.count({ where: { verificationStatus: { not: "VERIFIED" } } }),
    db.user.count(),
  ]);
  const cards = [
    { n: unverifiedPapers, label: "Papers awaiting verification", href: "/admin/papers" },
    { n: failed, label: "Papers with failed extraction", href: "/admin/papers" },
    { n: candidates, label: "Discovered links to review", href: "/admin/papers" },
    { n: unverifiedSources, label: "Library sources awaiting review", href: "/admin/library" },
    { n: unverifiedConfig, label: "Regulations not yet verified", href: "/admin/universities" },
    { n: users, label: "Registered users", href: "/admin/users" },
  ];
  return (
    <>
      <PageHeader title="Administration" description="Keep academic data honest: confirm the syllabus, verify papers, and curate the sources the AI may cite." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="card block transition hover:border-brand">
              <p className="font-serif text-3xl font-semibold text-brand-strong">{c.n}</p>
              <p className="text-sm text-muted">{c.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
