// Words that change how a question is phrased but not what it asks about.
const FILLER = new Set(
  (
    "a an the of on in to for with and or its it is are be by as at about from into " +
    "explain describe discuss write define enumerate list mention state briefly brief detail detailed " +
    "elaborate outline short note notes give what how why which who whom any various different " +
    "patient patients client clients person persons following under following"
  ).split(" "),
);

/** Lower-cases, strips numbering, marks annotations and punctuation. Stored as Question.normalizedText. */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(\s*\d+(\.\d+)?\s*(marks?|m)?\s*\)|\[\s*\d+(\.\d+)?\s*\]|\b\d+(\.\d+)?\s*marks?\b/g, " ")
    .replace(/^\s*(q(uestion)?\s*)?(\d+|[ivx]+|[a-z])\s*[.)\]:-]\s*/i, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(ations?|ings?|ies|es|ed|s)$/, "");
}

export function contentTokens(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(" ")
      .filter((w) => w && !FILLER.has(w))
      .map(stem),
  );
}

/** Dice coefficient over content tokens, 0..1. */
export function questionSimilarity(a: string, b: string): number {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

/**
 * Two questions count as "the same question" at or above this score.
 * Tuned so "nursing management of MI" and "medical management of MI" stay apart (0.75)
 * while "nursing management of a patient with MI" and "nursing management of MI" merge.
 */
export const SAME_QUESTION_THRESHOLD = 0.8;

/** Returns the index of the best-matching candidate at/above threshold, or -1. */
export function findBestMatch(normalized: string, candidates: string[][]): number {
  let best = -1;
  let bestScore = SAME_QUESTION_THRESHOLD;
  candidates.forEach((members, i) => {
    for (const m of members) {
      const s = questionSimilarity(normalized, m);
      if (s >= bestScore) {
        best = i;
        bestScore = s;
      }
    }
  });
  return best;
}
