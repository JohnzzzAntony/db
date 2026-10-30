import Link from "next/link";
import { requireUser, hasRole } from "@/lib/auth/dal";
import { logout } from "../(auth)/actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/subjects", label: "Subjects" },
    { href: "/study", label: "Study Generator" },
    { href: "/papers", label: "Question Papers" },
    { href: "/papers/analysis", label: "Repeated Questions" },
    ...(hasRole(user, "FACULTY") ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="no-print border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="font-serif text-lg font-semibold text-brand-strong">
            Koshys Nursing AI
          </Link>
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">
              {user.name} · {user.role.toLowerCase()}
            </span>
            <form action={logout}>
              <button className="btn-secondary px-3 py-1.5">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
