import Link from "next/link";
import { NavLinks } from "./nav-links";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/study", label: "Study Generator" },
  { href: "/tutor", label: "Ask the Tutor" },
  { href: "/subjects", label: "Subjects" },
  { href: "/papers", label: "Question Papers" },
  { href: "/clinical", label: "Clinical Records" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="no-print border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-serif text-lg font-semibold text-brand-strong">
            Koshys Nursing Study
          </Link>
          <NavLinks links={LINKS} />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-xs text-muted">
        Your notes, papers and progress are saved only in this browser. Use Settings → Download backup to keep a copy.
        AI answers are study aids, not official university material.
      </footer>
    </div>
  );
}
