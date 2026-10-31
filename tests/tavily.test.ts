import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

process.env.TAVILY_API_KEY = "tvly-test";
let mod: typeof import("@/lib/research/tavily");
beforeAll(async () => {
  mod = await import("@/lib/research/tavily");
});
afterEach(() => vi.unstubAllGlobals());

const results = (n: number, host = "ncbi.nlm.nih.gov") =>
  new Response(JSON.stringify({ results: Array.from({ length: n }, (_, i) => ({ title: `T${i}`, url: `https://${host}/${i}`, content: `c${i}` })) }));

describe("webResearch", () => {
  it("searches trusted medical sites first with the key in the header", async () => {
    const fetchMock = vi.fn(async () => results(4));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mod.webResearch("heart failure nursing");
    expect(out).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.tavily.com/search");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tvly-test");
    const body = JSON.parse(init.body as string);
    expect(body.include_domains).toEqual(mod.TRUSTED_DOMAINS);
    expect(body.search_depth).toBe("advanced");
  });

  it("tops up from the open web when trusted sites return little, without duplicates", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(results(1)).mockResolvedValueOnce(results(3, "example.org"));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mod.webResearch("rare topic");
    expect(out.map((s) => s.url)).toEqual(["https://ncbi.nlm.nih.gov/0", "https://example.org/0", "https://example.org/1", "https://example.org/2"]);
  });

  it("returns no sources instead of failing when search errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad key", { status: 401 })));
    expect(await mod.webResearch("x")).toEqual([]);
  });

  it("fences sources as numbered, labelled blocks", () => {
    const block = mod.sourcesBlock([{ title: 'A "q"', url: "https://who.int/a", content: "text" }]);
    expect(block).toContain('<source id="S1" title="A \'q\'" url="https://who.int/a">');
    expect(mod.sourcesBlock([])).toMatch(/No web sources/);
  });
});
