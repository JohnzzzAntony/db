const tone = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  brand: "bg-brand-soft text-brand-strong",
  muted: "bg-border/60 text-muted",
} as const;

export function Badge({ children, variant = "muted" }: { children: React.ReactNode; variant?: keyof typeof tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone[variant]}`}>{children}</span>;
}
