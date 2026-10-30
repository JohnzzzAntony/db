"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // Most specific match wins so /papers/analysis doesn't also highlight /papers.
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active === l.href ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 transition ${active === l.href ? "bg-brand-soft font-medium text-brand-strong" : "text-muted hover:text-foreground"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
