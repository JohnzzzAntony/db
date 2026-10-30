import type { VerificationStatus } from "@/generated/prisma/enums";
import { CONFIDENCE_LABELS, type ConfidenceLabel } from "@/lib/papers/analysis";

const tone = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  brand: "bg-brand-soft text-brand-strong",
  danger: "bg-danger/10 text-danger",
  muted: "bg-border/60 text-muted",
} as const;

export function Badge({ children, variant = "muted", title }: { children: React.ReactNode; variant?: keyof typeof tone; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone[variant]}`}>
      {children}
    </span>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "VERIFIED") return <Badge variant="ok">Verified</Badge>;
  if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
  return (
    <Badge variant="warn" title="Not yet confirmed by faculty or an official source">
      Unverified
    </Badge>
  );
}

const LABEL_VARIANT: Record<ConfidenceLabel, keyof typeof tone> = {
  VERIFIED_PYQ: "ok",
  FREQUENTLY_REPEATED: "brand",
  HIGH_PRIORITY_SYLLABUS: "brand",
  AI_PREDICTED: "muted",
  UNVERIFIED: "warn",
};

export function ConfidenceBadge({ label }: { label: ConfidenceLabel }) {
  return <Badge variant={LABEL_VARIANT[label]}>{CONFIDENCE_LABELS[label].toUpperCase()}</Badge>;
}
