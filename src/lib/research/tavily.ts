import "server-only";
import { env } from "@/lib/env";

export type WebSource = { title: string; url: string; content: string };

// Sites with reviewed clinical content. Searched first; the open web is the fallback.
export const TRUSTED_DOMAINS = [
  "ncbi.nlm.nih.gov",
  "medlineplus.gov",
  "who.int",
  "mohfw.gov.in",
  "nhm.gov.in",
  "indiannursingcouncil.org",
  "cdc.gov",
  "nice.org.uk",
  "msdmanuals.com",
  "nhs.uk",
];

export const webResearchEnabled = () => Boolean(env.TAVILY_API_KEY);

async function search(query: string, maxResults: number, includeDomains?: string[]): Promise<WebSource[]> {
  const res = await fetch(`${env.TAVILY_BASE_URL}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TAVILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query.slice(0, 380),
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: false,
      ...(includeDomains ? { include_domains: includeDomains } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const body = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (body.results ?? [])
    .filter((r) => r.url && r.content)
    .map((r) => ({ title: (r.title || r.url!).slice(0, 200), url: r.url!, content: r.content!.slice(0, 2500) }));
}

/**
 * Web research for one question. Never throws: if search is off or fails, the answer is
 * written without sources (and says so) rather than not at all.
 */
export async function webResearch(query: string, maxResults = 6): Promise<WebSource[]> {
  if (!webResearchEnabled()) return [];
  try {
    const trusted = await search(query, maxResults, TRUSTED_DOMAINS);
    if (trusted.length >= 3) return trusted;
    const open = await search(query, maxResults);
    const seen = new Set(trusted.map((s) => s.url));
    return [...trusted, ...open.filter((s) => !seen.has(s.url))].slice(0, maxResults);
  } catch (err) {
    console.error("Web research failed", err);
    return [];
  }
}

/** Sources as numbered blocks for a prompt. Web text is untrusted, so it is fenced and labelled. */
export function sourcesBlock(sources: WebSource[]): string {
  if (!sources.length) return "<sources>No web sources were found. Do not cite any source.</sources>";
  return `<sources>\n${sources
    .map((s, i) => `<source id="S${i + 1}" title="${s.title.replace(/"/g, "'")}" url="${s.url}">\n${s.content}\n</source>`)
    .join("\n")}\n</sources>`;
}
