/** Evidence labels from the platform spec. Only the first three are derived from papers. */
export const CONFIDENCE_LABELS = {
  VERIFIED_PYQ: "Verified previous-year question",
  FREQUENTLY_REPEATED: "Frequently repeated question",
  UNVERIFIED: "Unverified question",
  HIGH_PRIORITY_SYLLABUS: "High-priority syllabus question",
  AI_PREDICTED: "AI-predicted question",
} as const;

export type ConfidenceLabel = keyof typeof CONFIDENCE_LABELS;

export type Appearance = {
  paperId: string;
  examYear: number | null;
  examMonth: number | null;
  examType: "REGULAR" | "SUPPLEMENTARY" | "UNKNOWN";
  verification: "VERIFIED" | "UNVERIFIED" | "REJECTED";
  marks: number | null;
  text: string;
  normalizedText: string;
  sourceUrl: string | null;
};

/** A paper in the same university+subject scope, used to tell "not asked" from "no paper". */
export type ScopePaper = {
  examYear: number | null;
  verification: "VERIFIED" | "UNVERIFIED" | "REJECTED";
};

export type YearStatus = "VERIFIED" | "UNVERIFIED" | "NOT_FOUND" | "NO_PAPER";

export type ClusterStats = {
  verifiedAppearances: number;
  totalAppearances: number;
  verifiedYears: number[];
  timeline: { year: number; status: YearStatus }[];
  lastSeenYear: number | null;
  wordingVariants: number;
  marksSeen: number[];
  labels: ConfidenceLabel[];
  notSeenRecently: boolean;
};

const RECENT_WINDOW_YEARS = 2;

/**
 * Turns the papers a question appeared in into the evidence shown to students.
 * Rejected papers are ignored entirely; unverified papers are reported but never
 * counted as verified appearances.
 */
export function analyzeCluster(appearances: Appearance[], scopePapers: ScopePaper[]): ClusterStats {
  const usable = appearances.filter((a) => a.verification !== "REJECTED");
  const verified = usable.filter((a) => a.verification === "VERIFIED");
  const verifiedPaperIds = new Set(verified.map((a) => a.paperId));
  const verifiedYears = [...new Set(verified.map((a) => a.examYear).filter((y): y is number => y != null))].sort();

  const years = scopePapers
    .filter((p) => p.verification !== "REJECTED" && p.examYear != null)
    .map((p) => p.examYear as number);
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  const timeline: ClusterStats["timeline"] = [];
  if (minYear != null && maxYear != null) {
    for (let year = minYear; year <= maxYear; year++) {
      const hits = usable.filter((a) => a.examYear === year);
      const papersThatYear = scopePapers.filter((p) => p.examYear === year && p.verification !== "REJECTED");
      let status: YearStatus;
      if (hits.some((a) => a.verification === "VERIFIED")) status = "VERIFIED";
      else if (hits.length) status = "UNVERIFIED";
      // Only a verified paper can prove a question was *not* asked.
      else if (papersThatYear.some((p) => p.verification === "VERIFIED")) status = "NOT_FOUND";
      else status = "NO_PAPER";
      timeline.push({ year, status });
    }
  }

  const seenYears = usable.map((a) => a.examYear).filter((y): y is number => y != null);
  const lastSeenYear = seenYears.length ? Math.max(...seenYears) : null;

  const labels: ConfidenceLabel[] = [];
  if (verifiedPaperIds.size >= 1) labels.push("VERIFIED_PYQ");
  if (verifiedPaperIds.size >= 2) labels.push("FREQUENTLY_REPEATED");
  if (verifiedPaperIds.size === 0 && usable.length) labels.push("UNVERIFIED");

  return {
    verifiedAppearances: verifiedPaperIds.size,
    totalAppearances: new Set(usable.map((a) => a.paperId)).size,
    verifiedYears,
    timeline,
    lastSeenYear,
    wordingVariants: new Set(usable.map((a) => a.normalizedText)).size,
    marksSeen: [...new Set(usable.map((a) => a.marks).filter((m): m is number => m != null))].sort((a, b) => a - b),
    labels,
    notSeenRecently:
      lastSeenYear != null && maxYear != null && maxYear - lastSeenYear > RECENT_WINDOW_YEARS,
  };
}
