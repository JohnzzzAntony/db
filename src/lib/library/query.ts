const STOPWORDS = new Set(
  "the and for with from that this what which about into their there these those then than when where explain describe discuss write note notes short long answer marks mark define definition management nursing patient patients care".split(
    " ",
  ),
);

/**
 * Builds a Postgres to_tsquery string (OR of terms) from free text.
 * Generic exam words ("explain", "nursing management") are dropped so they don't
 * dominate ranking; returns null when nothing searchable remains.
 */
export function buildTsQuery(text: string, maxTerms = 12): string | null {
  const terms = [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    ),
  ].slice(0, maxTerms);
  return terms.length ? terms.join(" | ") : null;
}
