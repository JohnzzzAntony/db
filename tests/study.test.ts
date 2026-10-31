import { describe, expect, it } from "vitest";
import { buildStudyPlan } from "@/lib/study/plan";
import { resolveReferences } from "@/lib/study/references";
import type { StudyOutput } from "@/lib/study/schema";

describe("buildStudyPlan", () => {
  it("scales exam answers with marks", () => {
    expect(buildStudyPlan("UNIVERSITY_EXAM", 2).sections).toEqual(["INTRODUCTION", "KEY_POINTS"]);
    expect(buildStudyPlan("UNIVERSITY_EXAM", 20).sections).toHaveLength(10);
    expect(buildStudyPlan("UNIVERSITY_EXAM", 5).flowchart).toBe(false);
    expect(buildStudyPlan("UNIVERSITY_EXAM", 10).flowchart).toBe(true);
  });
  it("sizes viva practice by marks", () => {
    expect(buildStudyPlan("VIVA", 2).vivaQuestions).toBe(5);
    expect(buildStudyPlan("VIVA", 20).vivaQuestions).toBe(20);
  });
  it("makes quick revision shorter than the exam answer", () => {
    expect(buildStudyPlan("QUICK_REVISION", 10).wordTarget).toBe("240-360 words");
    expect(buildStudyPlan("QUICK_REVISION", 10).memoryAids).toBe(true);
  });
});

const section = (over: Partial<StudyOutput["sections"][number]>): StudyOutput["sections"][number] => ({
  key: "INTRODUCTION", heading: "A. Introduction", markdown: "x", evidence: "SOURCE_SUPPORTED", sourceIds: [], verificationNote: null, ...over,
});
const base: StudyOutput = { title: "CHF", sections: [], flowchart: null, memoryAids: [], vivaQuestions: [], textbookIds: [], caveats: [] };
const chunk = (documentId: string, page: number | null) => ({
  id: `c-${documentId}-${page}`, documentId, title: `Doc ${documentId}`, authors: null, publisher: null, edition: null, year: null, url: null, page,
});

describe("resolveReferences", () => {
  it("maps source ids to real documents, merging pages", () => {
    const out = resolveReferences(
      { ...base, sections: [section({ sourceIds: ["S1", "S2"] })] },
      [chunk("d1", 12), chunk("d1", 4)],
      [],
      "x",
      { mode: "UNIVERSITY_EXAM", marks: 10 },
    );
    expect(out.references).toEqual([expect.objectContaining({ kind: "LIBRARY", id: "d1", pages: [4, 12] })]);
    expect(out.sections[0].references).toEqual([0]);
  });

  it("drops invented ids and downgrades unsupported claims", () => {
    const out = resolveReferences(
      { ...base, sections: [section({ sourceIds: ["S9", "Harrison 2022"] })], textbookIds: ["T5", "T1"] },
      [chunk("d1", 1)],
      [{ id: "tb1", title: "Brunner", authors: "Hinkle", edition: "15", publisher: null, year: null }],
      "x",
      { mode: "UNIVERSITY_EXAM", marks: 10 },
    );
    expect(out.sections[0].evidence).toBe("STANDARD_TEXTBOOK");
    expect(out.references).toEqual([expect.objectContaining({ kind: "TEXTBOOK", id: "tb1" })]);
  });

  it("warns when no library source matched", () => {
    const out = resolveReferences(base, [], [], "x", { mode: "VIVA", marks: 2 });
    expect(out.caveats[0]).toMatch(/No verified library sources/);
  });
});

describe("studyOutputSchema", () => {
  it("converts to JSON Schema for providers without native structured output", async () => {
    const { z } = await import("zod");
    const { studyOutputSchema } = await import("@/lib/study/schema");
    const json = z.toJSONSchema(studyOutputSchema) as { properties: Record<string, unknown> };
    expect(Object.keys(json.properties)).toEqual(expect.arrayContaining(["title", "sections", "textbookIds"]));
  });
});
