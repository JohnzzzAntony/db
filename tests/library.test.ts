import { describe, expect, it } from "vitest";
import { chunkPages } from "@/lib/library/chunk";
import { buildTsQuery } from "@/lib/library/query";

describe("buildTsQuery", () => {
  it("drops exam filler words and joins terms with OR", () => {
    expect(buildTsQuery("Explain the nursing management of congestive heart failure")).toBe(
      "congestive | heart | failure",
    );
  });
  it("strips characters that would break to_tsquery", () => {
    expect(buildTsQuery("diabetes' & | ! ( mellitus")).toBe("diabetes | mellitus");
  });
  it("returns null for nothing searchable", () => {
    expect(buildTsQuery("explain the")).toBeNull();
  });
});

describe("chunkPages", () => {
  it("keeps page numbers and splits long text with overlap", () => {
    const para = "Heart failure is a clinical syndrome. ".repeat(80);
    const chunks = chunkPages(["short page text that is long enough to keep around.", para]);
    expect(chunks[0].page).toBe(1);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.content.length <= 1400)).toBe(true);
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
  });
});
