export type Chunk = { ordinal: number; page: number | null; content: string };

const TARGET = 1400;
const OVERLAP = 200;

/**
 * Splits page texts into ~TARGET-character chunks on paragraph/sentence boundaries,
 * with a short overlap so a fact split across a boundary is still retrievable.
 * `pages[i]` is page i+1; pass a single-element array for non-paginated text.
 */
export function chunkPages(pages: string[], paginated = true): Chunk[] {
  const chunks: Chunk[] = [];
  pages.forEach((raw, i) => {
    const text = raw.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + TARGET, text.length);
      if (end < text.length) {
        const window = text.slice(start, end);
        const para = window.lastIndexOf("\n\n");
        const sentence = window.lastIndexOf(". ");
        const cut = para > TARGET * 0.5 ? para : sentence > TARGET * 0.5 ? sentence + 1 : -1;
        if (cut > 0) end = start + cut;
      }
      const content = text.slice(start, end).trim();
      if (content.length > 40) {
        chunks.push({ ordinal: chunks.length, page: paginated ? i + 1 : null, content });
      }
      if (end >= text.length) break;
      start = Math.max(end - OVERLAP, start + 1);
    }
  });
  return chunks;
}
