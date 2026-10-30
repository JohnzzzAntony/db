import { describe, expect, it } from "vitest";
import { analyzeCluster, type Appearance, type ScopePaper } from "@/lib/papers/analysis";

const app = (paperId: string, examYear: number, verification: Appearance["verification"], text = "q"): Appearance => ({
  paperId, examYear, examMonth: null, examType: "REGULAR", verification, marks: 10, text, normalizedText: text, sourceUrl: null,
});

describe("analyzeCluster", () => {
  // Mirrors the spec example: 2022 V, 2023 not found, 2024 V, 2025 V, 2026 not verified.
  const scope: ScopePaper[] = [
    { examYear: 2022, verification: "VERIFIED" },
    { examYear: 2023, verification: "VERIFIED" },
    { examYear: 2024, verification: "VERIFIED" },
    { examYear: 2025, verification: "VERIFIED" },
    { examYear: 2026, verification: "UNVERIFIED" },
  ];
  const appearances = [
    app("p22", 2022, "VERIFIED"),
    app("p24", 2024, "VERIFIED", "q2"),
    app("p25", 2025, "VERIFIED"),
    app("p26", 2026, "UNVERIFIED"),
  ];

  it("counts only verified papers as verified appearances", () => {
    const s = analyzeCluster(appearances, scope);
    expect(s.verifiedAppearances).toBe(3);
    expect(s.totalAppearances).toBe(4);
    expect(s.labels).toEqual(["VERIFIED_PYQ", "FREQUENTLY_REPEATED"]);
    expect(s.wordingVariants).toBe(2);
  });

  it("distinguishes not-found years from years with an unverified sighting", () => {
    const s = analyzeCluster(appearances, scope);
    expect(s.timeline).toEqual([
      { year: 2022, status: "VERIFIED" },
      { year: 2023, status: "NOT_FOUND" },
      { year: 2024, status: "VERIFIED" },
      { year: 2025, status: "VERIFIED" },
      { year: 2026, status: "UNVERIFIED" },
    ]);
  });

  it("never proves absence from an unverified paper", () => {
    const s = analyzeCluster([app("a", 2020, "VERIFIED")], [
      { examYear: 2020, verification: "VERIFIED" },
      { examYear: 2021, verification: "UNVERIFIED" },
    ]);
    expect(s.timeline[1]).toEqual({ year: 2021, status: "NO_PAPER" });
  });

  it("labels questions only seen on unverified papers as unverified", () => {
    const s = analyzeCluster([app("a", 2024, "UNVERIFIED")], [{ examYear: 2024, verification: "UNVERIFIED" }]);
    expect(s.labels).toEqual(["UNVERIFIED"]);
    expect(s.verifiedAppearances).toBe(0);
  });

  it("ignores rejected papers", () => {
    const s = analyzeCluster([app("a", 2024, "REJECTED")], [{ examYear: 2024, verification: "REJECTED" }]);
    expect(s.labels).toEqual([]);
    expect(s.timeline).toEqual([]);
  });

  it("flags questions absent from recent papers", () => {
    const s = analyzeCluster([app("a", 2019, "VERIFIED")], [
      { examYear: 2019, verification: "VERIFIED" },
      { examYear: 2024, verification: "VERIFIED" },
    ]);
    expect(s.notSeenRecently).toBe(true);
  });
});
