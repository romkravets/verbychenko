// In-memory rate limiter — resets on cold start, acceptable for MVP on Vercel
// For stricter limits use Upstash Redis + @upstash/ratelimit

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

export function getIp(req: Request): string {
  const xff = (req.headers as Headers).get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}
