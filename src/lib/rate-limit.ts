const hits = new Map<string, number[]>();

/**
 * Sliding one-hour window per key.
 * shortcut: in-memory, so each server instance counts separately and restarts reset it;
 * move to a shared store (e.g. Upstash Redis) if the site is opened to the public.
 */
export function allowRequest(key: string, limit: number, now = Date.now()): boolean {
  const windowStart = now - 60 * 60 * 1000;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
