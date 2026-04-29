import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';

vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn() },
  lookup: vi.fn(),
}));
import dns from 'node:dns/promises';
const mockLookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;

import { buildApp } from '../index';

let original: Dispatcher;
let mock: MockAgent;

beforeEach(() => {
  original = getGlobalDispatcher();
  mock = new MockAgent();
  mock.disableNetConnect();
  setGlobalDispatcher(mock);
  mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

afterEach(() => {
  setGlobalDispatcher(original);
});

describe('POST /api/pulse', () => {
  it('400 on invalid JSON body', async () => {
    const app = buildApp();
    const res = await app.request('/api/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('400 when url missing', async () => {
    const app = buildApp();
    const res = await app.request('/api/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expect: 'foo' }),
    });
    expect(res.status).toBe(400);
  });

  it('400 with ssrf_blocked when url is private', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    const app = buildApp();
    const res = await app.request('/api/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1/' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('ssrf_blocked');
  });

  it('200 with full report on a public URL', async () => {
    const pool = mock.get('https://public.example');
    pool.intercept({ path: '/', method: 'GET' }).reply(200, '<title>x</title>', {
      headers: { 'content-type': 'text/html' },
    });
    pool.intercept({ path: '/', method: 'HEAD' }).reply(200, '');
    const app = buildApp();
    const res = await app.request('/api/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://public.example/' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedUrl).toBe('https://public.example/');
    expect(body.composite.grade).toBeDefined();
    expect(body.checks).toBeDefined();
  });
});
