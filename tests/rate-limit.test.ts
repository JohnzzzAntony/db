import { describe, expect, it } from "vitest";
import { allowRequest } from "@/lib/rate-limit";

describe("allowRequest", () => {
  it("allows up to the limit per key within an hour, then blocks", () => {
    const t = 1_000_000;
    expect(allowRequest("a", 2, t)).toBe(true);
    expect(allowRequest("a", 2, t + 1)).toBe(true);
    expect(allowRequest("a", 2, t + 2)).toBe(false);
    expect(allowRequest("b", 2, t + 2)).toBe(true);
  });
  it("frees capacity once requests are older than an hour", () => {
    const t = 5_000_000;
    allowRequest("c", 1, t);
    expect(allowRequest("c", 1, t + 1000)).toBe(false);
    expect(allowRequest("c", 1, t + 60 * 60 * 1000 + 1)).toBe(true);
  });
});
