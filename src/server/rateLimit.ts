import type { Context, MiddlewareHandler } from 'hono';

export interface RateLimitOpts {
  /** Maximum burst before any request is blocked. */
  bucketSize: number;
  /** Milliseconds between token refills (one token per this interval). */
  refillIntervalMs: number;
  /**
   * Trust `X-Forwarded-For` for the client IP. Required behind Cloud Run /
   * any reverse proxy. Defaults to true.
   */
  trustForwardedFor?: boolean;
}

export interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Pure token-bucket evaluator. Given the previous bucket state and the current
 * time, returns the new bucket state plus a decision about the request. No I/O,
 * no globals - easy to unit-test deterministically.
 */
export function evaluateBucket(
  state: BucketState | undefined,
  opts: RateLimitOpts,
  nowMs: number,
): { state: BucketState; decision: RateLimitDecision } {
  const prevTokens = state?.tokens ?? opts.bucketSize;
  const lastRefillMs = state?.lastRefillMs ?? nowMs;
  const elapsed = Math.max(0, nowMs - lastRefillMs);
  const refilled = elapsed / opts.refillIntervalMs;
  const refilledTokens = Math.min(opts.bucketSize, prevTokens + refilled);

  if (refilledTokens < 1) {
    const tokensNeeded = 1 - refilledTokens;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((tokensNeeded * opts.refillIntervalMs) / 1000),
    );
    return {
      state: { tokens: refilledTokens, lastRefillMs: nowMs },
      decision: { allowed: false, remaining: 0, retryAfterSec },
    };
  }

  const remaining = refilledTokens - 1;
  return {
    state: { tokens: remaining, lastRefillMs: nowMs },
    decision: { allowed: true, remaining: Math.floor(remaining), retryAfterSec: 0 },
  };
}

/**
 * Hono middleware: per-IP token bucket. In-memory, scoped to the process.
 * Cloud Run's ephemeral instances are fine for this - when an instance scales
 * down, its buckets go with it; a new instance starts a new abuser at full
 * tokens. Good enough for a demo gate.
 */
export function rateLimit(opts: RateLimitOpts): MiddlewareHandler {
  const buckets = new Map<string, BucketState>();
  const trustForwardedFor = opts.trustForwardedFor ?? true;

  // Best-effort cleanup so a long-running instance doesn't accumulate
  // millions of stale entries from one-shot visitors.
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  const STALE_AFTER_MS = 30 * 60 * 1000;
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefillMs > STALE_AFTER_MS) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't keep the event loop alive just for the cleanup timer.
  if (typeof interval.unref === 'function') interval.unref();

  return async (c, next) => {
    const ip = clientIp(c, trustForwardedFor);
    const now = Date.now();
    const result = evaluateBucket(buckets.get(ip), opts, now);
    buckets.set(ip, result.state);

    c.header('X-RateLimit-Limit', String(opts.bucketSize));
    c.header('X-RateLimit-Remaining', String(result.decision.remaining));

    if (!result.decision.allowed) {
      c.header('Retry-After', String(result.decision.retryAfterSec));
      return c.json(
        {
          error: 'rate_limited',
          message: `Too many pulses from your address. Try again in ${result.decision.retryAfterSec}s.`,
          retryAfterSec: result.decision.retryAfterSec,
        },
        429,
      );
    }

    return next();
  };
}

function clientIp(c: Context, trustForwardedFor: boolean): string {
  if (trustForwardedFor) {
    const xff = c.req.header('x-forwarded-for');
    if (xff) {
      const first = xff.split(',')[0]?.trim();
      if (first) return first;
    }
    const real = c.req.header('x-real-ip');
    if (real) return real.trim();
  }
  // Hono+@hono/node-server exposes the raw IncomingMessage at c.env.incoming
  // for direct socket access. Fall back to 'unknown' when nothing is available
  // (rare in production, common in tests).
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
