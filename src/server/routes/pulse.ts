import { Hono } from 'hono';
import { z } from 'zod';
import { runPulse } from '../orchestrator.js';
import { SsrfError } from '../ssrfGuard.js';
import { logger, newRequestId } from '../logger.js';

const Body = z.object({
  url: z.string().min(1),
  expect: z.string().optional(),
});

export interface PulseDeps {
  maxRedirectHops: number;
  checkTimeoutMs: number;
}

export function pulseRoute(deps: PulseDeps) {
  const app = new Hono();
  app.post('/api/pulse', async (c) => {
    const reqId = newRequestId();
    const log = logger.child({ reqId, route: 'pulse' });
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'invalid_request', issues: parsed.error.issues }, 400);
    }

    const startedAt = Date.now();
    try {
      const report = await runPulse(
        { url: parsed.data.url, expect: parsed.data.expect ?? null },
        { maxRedirectHops: deps.maxRedirectHops, checkTimeoutMs: deps.checkTimeoutMs },
      );
      log.info({ url: parsed.data.url, durationMs: Date.now() - startedAt, grade: report.composite.grade }, 'pulse.ok');
      return c.json(report);
    } catch (e) {
      if (e instanceof SsrfError) {
        log.warn({ url: parsed.data.url, code: e.code }, 'pulse.ssrf_blocked');
        return c.json({ error: 'ssrf_blocked', code: e.code, message: e.message }, 400);
      }
      log.error({ err: e, url: parsed.data.url }, 'pulse.failed');
      return c.json({ error: 'internal_error' }, 500);
    }
  });
  return app;
}
