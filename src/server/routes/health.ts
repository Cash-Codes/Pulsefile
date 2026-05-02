import { Hono } from 'hono';

export interface HealthDeps {
  sha: string;
  startedAt: number;
}

export function healthRoute(deps: HealthDeps) {
  const app = new Hono();
  app.get('/health', (c) => {
    return c.json({
      ok: true,
      sha: deps.sha,
      uptime_s: Math.round((Date.now() - deps.startedAt) / 1000),
    });
  });
  return app;
}
