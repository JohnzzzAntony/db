import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AiGenerationError, getClient } from "@/lib/ai/client";

const SYSTEM = `You help a nursing college find publicly available previous-year university examination question papers.
Run focused web searches (official university sites, examination portals, college repositories, public archives).
Search only; do not summarise paper contents and do not state that a paper exists unless a search result shows it.`;

const PAPER_HINT = /question|paper|exam|qp|pyq|\.pdf/i;

/**
 * Searches the web for candidate paper links. Only URLs that came back from the search
 * tool are stored — never URLs written by the model — and every candidate stays
 * unverified until a person imports and verifies it.
 */
export async function discoverPapers(opts: { universityId: string; query: string }) {
  const university = await db.university.findUniqueOrThrow({ where: { id: opts.universityId } });
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `University: ${university.name}${university.website ? ` (${university.website})` : ""}
Find previous-year question papers for: ${opts.query}`,
    },
  ];

  const found = new Map<string, { title: string; url: string }>();
  for (let turn = 0; turn < 3; turn++) {
    let response: Anthropic.Message;
    try {
      response = await getClient().messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: SYSTEM,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
        messages,
      });
    } catch (err) {
      console.error("discoverPapers failed", err);
      throw new AiGenerationError("Web search is unavailable right now. Check that web search is enabled for the API key.");
    }

    for (const block of response.content) {
      if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
      for (const r of block.content) {
        if (r.type === "web_search_result" && PAPER_HINT.test(`${r.title} ${r.url}`)) {
          found.set(r.url, { title: r.title, url: r.url });
        }
      }
    }
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  const yearOf = (s: string) => {
    const m = s.match(/\b(20[0-3]\d)\b/);
    return m ? Number(m[1]) : null;
  };
  for (const c of found.values()) {
    await db.paperCandidate.upsert({
      where: { universityId_url: { universityId: university.id, url: c.url } },
      create: {
        universityId: university.id,
        query: opts.query,
        title: c.title.slice(0, 300),
        url: c.url,
        examYear: yearOf(`${c.title} ${c.url}`),
      },
      update: {},
    });
  }
  return found.size;
}
