import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { evaluateBucket, rateLimit } from './rateLimit';

describe('evaluateBucket', () => {
  const opts = { bucketSize: 3, refillIntervalMs: 1000 };

  it('allows up to bucketSize requests on a fresh IP', () => {
    let state: ReturnType<typeof evaluateBucket>['state'] | undefined;
    const now = 1_000_000;
    for (let i = 0; i < opts.bucketSize; i++) {
      const r = evaluateBucket(state, opts, now);
      expect(r.decision.allowed).toBe(true);
      expect(r.decision.remaining).toBe(opts.bucketSize - 1 - i);
      state = r.state;
    }
  });

  it('rejects the (bucketSize+1)-th call within the same instant', () => {
    let state: ReturnType<typeof evaluateBucket>['state'] | undefined;
    const now = 1_000_000;
    for (let i = 0; i < opts.bucketSize; i++) {
      state = evaluateBucket(state, opts, now).state;
    }
    const r = evaluateBucket(state, opts, now);
    expect(r.decision.allowed).toBe(false);
    expect(r.decision.remaining).toBe(0);
    expect(r.decision.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('refills tokens as time passes', () => {
    // Drain the bucket
    let state: ReturnType<typeof evaluateBucket>['state'] | undefined;
    const t0 = 1_000_000;
    for (let i = 0; i < opts.bucketSize; i++) {
      state = evaluateBucket(state, opts, t0).state;
    }
    expect(evaluateBucket(state, opts, t0).decision.allowed).toBe(false);

    // Wait two refill intervals - bucket should hold ~2 tokens
    const t1 = t0 + 2 * opts.refillIntervalMs;
    const after = evaluateBucket(state, opts, t1);
    expect(after.decision.allowed).toBe(true);
  });

  it('caps refilled tokens at bucketSize', () => {
    const state = { tokens: 0, lastRefillMs: 1_000_000 };
    const muchLater = 1_000_000 + 99 * opts.refillIntervalMs;
    const r = evaluateBucket(state, opts, muchLater);
    expect(r.decision.allowed).toBe(true);
    // After the consumption of 1 token, remaining should be (bucketSize - 1)
    expect(r.decision.remaining).toBe(opts.bucketSize - 1);
  });

  it('reports a retryAfterSec that matches the refill schedule', () => {
    const state = { tokens: 0, lastRefillMs: 1_000_000 };
    // Right at the empty moment, we need a full 1000ms to mint the next token
    const r = evaluateBucket(state, { bucketSize: 3, refillIntervalMs: 1000 }, 1_000_000);
    expect(r.decision.retryAfterSec).toBe(1);
  });
});

describe('rateLimit middleware', () => {
  it('lets the first N requests through and 429s the next', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimit({ bucketSize: 2, refillIntervalMs: 60_000 }));
    app.get('/api/ping', (c) => c.json({ ok: true }));

    const headers = { 'x-forwarded-for': '203.0.113.5' };

    const r1 = await app.request('/api/ping', { headers });
    expect(r1.status).toBe(200);
    expect(r1.headers.get('x-ratelimit-limit')).toBe('2');
    expect(r1.headers.get('x-ratelimit-remaining')).toBe('1');

    const r2 = await app.request('/api/ping', { headers });
    expect(r2.status).toBe(200);
    expect(r2.headers.get('x-ratelimit-remaining')).toBe('0');

    const r3 = await app.request('/api/ping', { headers });
    expect(r3.status).toBe(429);
    expect(r3.headers.get('retry-after')).toBeTruthy();
    const body = await r3.json();
    expect(body.error).toBe('rate_limited');
    expect(body.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('isolates buckets per client IP', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimit({ bucketSize: 1, refillIntervalMs: 60_000 }));
    app.get('/api/ping', (c) => c.json({ ok: true }));

    const a = await app.request('/api/ping', { headers: { 'x-forwarded-for': '203.0.113.5' } });
    const b = await app.request('/api/ping', { headers: { 'x-forwarded-for': '198.51.100.7' } });
    const aAgain = await app.request('/api/ping', { headers: { 'x-forwarded-for': '203.0.113.5' } });

    expect(a.status).toBe(200);
    expect(b.status).toBe(200); // different IP, fresh bucket
    expect(aAgain.status).toBe(429); // same IP, exhausted
  });

  it('takes the leftmost entry of a comma-separated XFF list', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimit({ bucketSize: 1, refillIntervalMs: 60_000 }));
    app.get('/api/ping', (c) => c.json({ ok: true }));

    // Same client (leftmost) seen via two different proxies - should share a bucket.
    const r1 = await app.request('/api/ping', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    const r2 = await app.request('/api/ping', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.2' },
    });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(429);
  });
});
