import { SECTION_LABELS, type ResolvedReference, type StudyContent, type StudyOutput } from "./schema";

/**
 * Replaces model-chosen ids with database records so every rendered reference is real.
 * Unknown ids are dropped, and a section claiming source support without a valid
 * source is downgraded.
 */
export function resolveReferences(
  data: StudyOutput,
  chunks: { id: string; documentId: string; title: string; authors: string | null; publisher: string | null; edition: string | null; year: number | null; url: string | null; page: number | null }[],
  textbooks: { id: string; title: string; authors: string; edition: string | null; publisher: string | null; year: number | null }[],
  wordTarget: string,
  opts: { mode: string; marks: number },
): StudyContent {
  const references: ResolvedReference[] = [];
  const refIndexByDoc = new Map<string, number>();

  const refForSource = (sid: string): number | null => {
    const chunk = chunks[Number(sid.replace(/^S/i, "")) - 1];
    if (!/^S\d+$/i.test(sid) || !chunk) return null;
    let idx = refIndexByDoc.get(chunk.documentId);
    if (idx == null) {
      idx = references.length;
      refIndexByDoc.set(chunk.documentId, idx);
      references.push({
        kind: "LIBRARY",
        id: chunk.documentId,
        title: chunk.title,
        authors: chunk.authors,
        publisher: chunk.publisher,
        edition: chunk.edition,
        year: chunk.year,
        url: chunk.url,
        pages: [],
      });
    }
    const ref = references[idx];
    if (ref.kind === "LIBRARY" && chunk.page && !ref.pages.includes(chunk.page)) ref.pages.push(chunk.page);
    return idx;
  };

  const sections = data.sections.map((s) => {
    const refs = [...new Set(s.sourceIds.map(refForSource).filter((i): i is number => i != null))];
    const evidence = s.evidence === "SOURCE_SUPPORTED" && refs.length === 0 ? "STANDARD_TEXTBOOK" : s.evidence;
    return { ...s, heading: s.heading || SECTION_LABELS[s.key], evidence, sourceIds: s.sourceIds, references: refs };
  });

  for (const tid of new Set(data.textbookIds)) {
    const t = /^T\d+$/i.test(tid) ? textbooks[Number(tid.slice(1)) - 1] : undefined;
    if (t) references.push({ kind: "TEXTBOOK", id: t.id, title: t.title, authors: t.authors, edition: t.edition, publisher: t.publisher, year: t.year });
  }
  for (const r of references) if (r.kind === "LIBRARY") r.pages.sort((a, b) => a - b);

  const caveats = [...data.caveats];
  if (!chunks.length) {
    caveats.unshift(
      "No verified library sources matched this topic, so no section is source-supported. Cross-check with your recommended textbooks.",
    );
  }

  return {
    title: data.title,
    sections,
    flowchart: data.flowchart,
    diagrams: data.diagrams.slice(0, 4),
    imageSearches: data.imageSearches.slice(0, 4),
    memoryAids: data.memoryAids,
    vivaQuestions: data.vivaQuestions,
    caveats,
    references,
    plan: { wordTarget, mode: opts.mode, marks: opts.marks },
  };
}
