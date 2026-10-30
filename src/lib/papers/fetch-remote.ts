import "server-only";
import { lookup } from "node:dns/promises";
import { isPublicAddress } from "./ip";

export class RemoteFetchError extends Error {}

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 20_000;

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RemoteFetchError("Invalid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new RemoteFetchError("Only http(s) URLs are allowed");
  if (url.username || url.password) throw new RemoteFetchError("URLs with credentials are not allowed");
  const addresses = await lookup(url.hostname, { all: true }).catch(() => {
    throw new RemoteFetchError("Could not resolve host");
  });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
    throw new RemoteFetchError("This host is not allowed");
  }
  return url;
}

/**
 * Downloads a public PDF/image with SSRF protection (every redirect hop is re-validated),
 * a size cap and a timeout. Residual risk: DNS rebinding between lookup and connect.
 */
export async function fetchRemoteFile(raw: string, maxBytes: number) {
  let url = await assertSafeUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "KoshysNursingAcademic/1.0 (question paper archive)" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new RemoteFetchError("Redirect without location");
      url = await assertSafeUrl(new URL(next, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new RemoteFetchError(`Download failed (HTTP ${res.status})`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new RemoteFetchError("File is too large");

    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RemoteFetchError("File is too large");
      }
      parts.push(value);
    }
    const bytes = Buffer.concat(parts);
    const fileName = decodeURIComponent(url.pathname.split("/").pop() || "paper.pdf").slice(0, 200);
    return { bytes, fileName, finalUrl: url.toString() };
  }
  throw new RemoteFetchError("Too many redirects");
}
