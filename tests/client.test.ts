import { describe, expect, it } from "vitest";
import { explainApiError } from "@/lib/ai/client";

describe("explainApiError", () => {
  it("names the setting to fix for setup problems", () => {
    expect(explainApiError(401, "invalid x-api-key", "claude-opus-5-5")).toMatch(/ANTHROPIC_API_KEY/);
    expect(explainApiError(404, "model: claude-opus", "claude-opus")).toMatch(/"claude-opus" was not found/);
    expect(explainApiError(400, "Your credit balance is too low to access the Anthropic API.", "m")).toMatch(/no credits/);
    expect(explainApiError(400, "effort is not supported", "claude-haiku-4-5")).toMatch(/Claude says: effort is not supported/);
    expect(explainApiError(undefined, "", "m")).toMatch(/connect/);
    expect(explainApiError(529, "Overloaded", "m")).toMatch(/temporarily unavailable/);
  });
});
