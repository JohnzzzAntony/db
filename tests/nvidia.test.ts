import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

process.env.NVIDIA_API_KEY = "test-key";
let mod: typeof import("@/lib/ai/nvidia");
beforeAll(async () => {
  mod = await import("@/lib/ai/nvidia");
});
afterEach(() => vi.unstubAllGlobals());

const reply = (content: string, finish_reason = "stop") =>
  new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason }] }), { status: 200 });

describe("extractJson", () => {
  it("ignores think blocks, fences and prose", () => {
    expect(mod.extractJson('<think>{"no":1}</think>Here:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(mod.extractJson("no json here")).toBeUndefined();
  });
});

describe("nvidiaStructured", () => {
  const schema = z.object({ title: z.string() });

  it("sends the key and model, and returns validated data", async () => {
    const fetchMock = vi.fn(async () => reply('{"title":"CHF"}'));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mod.nvidiaStructured({ schema, system: "s", user: "u" });
    expect(out).toEqual({ data: { title: "CHF" }, model: "nvidia/nemotron-3.5-bolt-e4b" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string).model).toBe("nvidia/nemotron-3.5-bolt-e4b");
  });

  it("retries once with the validation problem, then succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply('{"name":"x"}')).mockResolvedValueOnce(reply('{"title":"ok"}'));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mod.nvidiaStructured({ schema, system: "s", user: "u" });
    expect(out.data.title).toBe("ok");
    const second = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(second.messages.at(-1).content).toMatch(/title/);
  });

  it("gives clear errors for a bad key and truncated output", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(mod.nvidiaStructured({ schema, system: "s", user: "u" })).rejects.toThrow(/key was rejected/);
    vi.stubGlobal("fetch", vi.fn(async () => reply('{"ti', "length")));
    await expect(mod.nvidiaStructured({ schema, system: "s", user: "u" })).rejects.toThrow(/too long/);
  });

  it("gives up after two invalid replies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply("sorry")));
    await expect(mod.nvidiaStructured({ schema, system: "s", user: "u" })).rejects.toThrow(/incomplete output/);
  });
});
