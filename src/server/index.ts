import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { healthRoute } from './routes/health.js';
import { pulseRoute } from './routes/pulse.js';
import { rateLimit } from './rateLimit.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BuildAppOpts {
  sha?: string;
  maxRedirectHops?: number;
  checkTimeoutMs?: number;
  serveClient?: boolean;
  /** Per-IP burst before rate-limiting kicks in (default: env RATE_LIMIT_BURST or 10). */
  rateLimitBurst?: number;
  /** Milliseconds between token refills (default: env RATE_LIMIT_REFILL_MS or 6000 = ~10/min sustained). */
  rateLimitRefillMs?: number;
}

export function buildApp(opts: BuildAppOpts = {}) {
  const sha = opts.sha ?? process.env.BUILD_SHA ?? 'dev';
  const startedAt = Date.now();
  const maxRedirectHops = opts.maxRedirectHops ?? Number(process.env.MAX_REDIRECT_HOPS ?? 10);
  const checkTimeoutMs = opts.checkTimeoutMs ?? Number(process.env.CHECK_TIMEOUT_MS ?? 4000);
  const serveClient = opts.serveClient ?? process.env.SERVE_CLIENT === '1';
  const rateLimitBurst = opts.rateLimitBurst ?? Number(process.env.RATE_LIMIT_BURST ?? 10);
  const rateLimitRefillMs = opts.rateLimitRefillMs ?? Number(process.env.RATE_LIMIT_REFILL_MS ?? 6000);

  const app = new Hono();
  app.use('/api/*', rateLimit({ bucketSize: rateLimitBurst, refillIntervalMs: rateLimitRefillMs }));
  app.route('/', healthRoute({ sha, startedAt }));
  app.route('/', pulseRoute({ maxRedirectHops, checkTimeoutMs }));

  if (serveClient) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const clientRoot = path.resolve(here, '../client');
    app.use('/*', serveStatic({ root: clientRoot }));
    app.get('*', serveStatic({ path: path.join(clientRoot, 'index.html') }));
  }
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  const app = buildApp({ serveClient: true });
  serve({ fetch: app.fetch, port });
  console.log(JSON.stringify({ msg: 'server.listening', port }));
}
