export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetEpochSec: number;
  retryAfterSec: number;
};

type WindowEntry = {
  timestamps: number[];
  expiresAt: number;
};

const MAX_STORE_ENTRIES = 10_000;
const store = new Map<string, WindowEntry>();
let opsSincePrune = 0;

function pruneExpired(nowMs: number) {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= nowMs || entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
  while (store.size > MAX_STORE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  return "127.0.0.1";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs = Date.now(),
): RateLimitResult {
  opsSincePrune++;
  if (opsSincePrune >= 100 || store.size > MAX_STORE_ENTRIES) {
    opsSincePrune = 0;
    pruneExpired(nowMs);
  }

  const cutoff = nowMs - windowMs;
  const existing = store.get(key);
  const active = existing ? existing.timestamps.filter(ts => ts > cutoff) : [];

  if (existing) {
    // Refresh insertion order for LRU eviction.
    store.delete(key);
  }

  if (active.length >= limit) {
    const oldestActive = active[0] ?? nowMs;
    const resetMs = oldestActive + windowMs;
    store.set(key, { timestamps: active, expiresAt: resetMs });
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetEpochSec: Math.ceil(resetMs / 1000),
      retryAfterSec: Math.max(1, Math.ceil((resetMs - nowMs) / 1000)),
    };
  }

  active.push(nowMs);
  const oldest = active[0] ?? nowMs;
  const resetMs = oldest + windowMs;
  store.set(key, { timestamps: active, expiresAt: nowMs + windowMs });

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - active.length),
    resetEpochSec: Math.ceil(resetMs / 1000),
    retryAfterSec: 0,
  };
}

export function checkGeneralApiLimit(request: Request, nowMs = Date.now()): RateLimitResult {
  const ip = extractClientIp(request);
  return checkRateLimit(`api:${ip}`, 60, 60_000, nowMs);
}

export function checkVisionApiLimit(request: Request, nowMs = Date.now()): RateLimitResult {
  const ip = extractClientIp(request);
  const perMinute = checkRateLimit(`vision:min:${ip}`, 5, 60_000, nowMs);
  if (!perMinute.allowed) return perMinute;

  const perDay = checkRateLimit(`vision:day:${ip}`, 25, 86_400_000, nowMs);
  if (!perDay.allowed) return perDay;

  return perMinute.remaining <= perDay.remaining ? perMinute : perDay;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetEpochSec),
  };
  if (!result.allowed && result.retryAfterSec > 0) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }
  return headers;
}

export function resetRateLimitStore(): void {
  store.clear();
  opsSincePrune = 0;
}
