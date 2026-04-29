import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { healthRoute } from './routes/health.js';
import { pulseRoute } from './routes/pulse.js';

export interface BuildAppOpts {
  sha?: string;
  maxRedirectHops?: number;
  checkTimeoutMs?: number;
}

export function buildApp(opts: BuildAppOpts = {}) {
  const sha = opts.sha ?? process.env.BUILD_SHA ?? 'dev';
  const startedAt = Date.now();
  const maxRedirectHops = opts.maxRedirectHops ?? Number(process.env.MAX_REDIRECT_HOPS ?? 10);
  const checkTimeoutMs = opts.checkTimeoutMs ?? Number(process.env.CHECK_TIMEOUT_MS ?? 4000);

  const app = new Hono();
  app.route('/', healthRoute({ sha, startedAt }));
  app.route('/', pulseRoute({ maxRedirectHops, checkTimeoutMs }));
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  const app = buildApp();
  serve({ fetch: app.fetch, port });
  console.log(JSON.stringify({ msg: 'server.listening', port }));
}
