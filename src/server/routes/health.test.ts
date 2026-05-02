import { describe, it, expect } from 'vitest';
import { buildApp } from '../index';

describe('GET /health', () => {
  it('returns ok with sha and uptime', async () => {
    const app = buildApp({ sha: 'test-sha' });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sha).toBe('test-sha');
    expect(typeof body.uptime_s).toBe('number');
  });
});
