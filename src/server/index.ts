import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { healthRoute } from './routes/health.js';

export interface BuildAppOpts {
  sha?: string;
}

export function buildApp(opts: BuildAppOpts = {}) {
  const sha = opts.sha ?? process.env.BUILD_SHA ?? 'dev';
  const startedAt = Date.now();
  const app = new Hono();
  app.route('/', healthRoute({ sha, startedAt }));
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  const app = buildApp();
  serve({ fetch: app.fetch, port });
  console.log(JSON.stringify({ msg: 'server.listening', port }));
}
