import Link from "next/link";
import { requireRole, hasRole } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("FACULTY");
  const links = [
    ["/admin", "Overview"],
    ["/admin/papers", "Paper review & discovery"],
    ["/admin/library", "Reference library"],
    ...(hasRole(user, "ADMIN")
      ? [
          ["/admin/universities", "Universities & syllabus"],
          ["/admin/requirements", "Clinical requirements"],
          ["/admin/users", "Users"],
        ]
      : []),
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Admin" className="no-print">
        <ul className="flex flex-wrap gap-1 text-sm lg:flex-col">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block rounded-md px-3 py-1.5 text-muted hover:bg-brand-soft hover:text-foreground">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
