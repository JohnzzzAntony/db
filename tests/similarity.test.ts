import { describe, expect, it } from "vitest";
import { findBestMatch, normalizeQuestion, questionSimilarity } from "@/lib/papers/similarity";

describe("normalizeQuestion", () => {
  it("strips numbering, marks and punctuation", () => {
    expect(normalizeQuestion("1. Explain the nursing management of Myocardial Infarction. (10 marks)")).toBe(
      "explain the nursing management of myocardial infarction",
    );
    expect(normalizeQuestion("b) Define hypertension [2]")).toBe("define hypertension");
  });
});

describe("questionSimilarity", () => {
  const n = normalizeQuestion;
  it("merges rewordings of the same question", () => {
    const a = n("Explain the nursing management of a patient with myocardial infarction");
    const b = n("Describe nursing management of myocardial infarction");
    expect(questionSimilarity(a, b)).toBeGreaterThanOrEqual(0.8);
  });
  it("keeps medical and nursing management apart", () => {
    const a = n("Nursing management of myocardial infarction");
    const b = n("Medical management of myocardial infarction");
    expect(questionSimilarity(a, b)).toBeLessThan(0.8);
  });
  it("separates unrelated topics", () => {
    expect(questionSimilarity(n("Define play therapy"), n("Define hypertension"))).toBe(0);
  });
});

describe("findBestMatch", () => {
  it("returns the matching cluster or -1", () => {
    const clusters = [["define hypertension"], ["nursing management of myocardial infarction"]];
    expect(findBestMatch(normalizeQuestion("Write the nursing management of myocardial infarction"), clusters)).toBe(1);
    expect(findBestMatch(normalizeQuestion("Explain play therapy"), clusters)).toBe(-1);
  });
});
