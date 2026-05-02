import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';

// Mock node:dns/promises so the SSRF guard's DNS lookup returns a public IP
// for any hostname, allowing validateAndPin to succeed and the request to
// flow through to the MockAgent. Without this, .example domains fail DNS
// and the trace returns an error outcome.
vi.mock('node:dns/promises', () => {
  const lookup = vi.fn(async (_host: string, _opts?: unknown) => [
    { address: '93.184.216.34', family: 4 },
  ]);
  return {
    default: { lookup },
    lookup,
  };
});

import { traceRedirects } from './traceRedirects';

let original: Dispatcher;
let mock: MockAgent;

beforeEach(() => {
  original = getGlobalDispatcher();
  mock = new MockAgent();
  mock.disableNetConnect();
  setGlobalDispatcher(mock);
});

afterEach(() => {
  setGlobalDispatcher(original);
});

describe('traceRedirects', () => {
  it('returns ok with no redirects on a 200', async () => {
    const pool = mock.get('https://final.example');
    pool.intercept({ path: '/', method: 'HEAD' }).reply(200, '');
    const out = await traceRedirects('https://final.example/', { maxHops: 10, timeoutMs: 4000 });
    expect((out as any).status).toBe('ok');
    expect((out as any).hops).toHaveLength(0);
    expect((out as any).finalUrl).toBe('https://final.example/');
    expect((out as any).capped).toBe(false);
  });

  it('follows a single redirect and returns ok', async () => {
    const startPool = mock.get('https://start.example');
    startPool.intercept({ path: '/', method: 'HEAD' }).reply(301, '', {
      headers: { location: 'https://final.example/' },
    });
    const finalPool = mock.get('https://final.example');
    finalPool.intercept({ path: '/', method: 'HEAD' }).reply(200, '');
    const out = await traceRedirects('https://start.example/', { maxHops: 10, timeoutMs: 4000 });
    expect((out as any).status).toBe('ok');
    expect((out as any).hops).toHaveLength(1);
    expect((out as any).hops[0].fromUrl).toBe('https://start.example/');
    expect((out as any).hops[0].toUrl).toBe('https://final.example/');
    expect((out as any).finalUrl).toBe('https://final.example/');
  });

  it('caps at maxHops and marks capped=true and warn', async () => {
    for (let i = 0; i < 5; i++) {
      const pool = mock.get(`https://h${i}.example`);
      pool.intercept({ path: '/', method: 'HEAD' }).reply(301, '', {
        headers: { location: `https://h${i + 1}.example/` },
      });
    }
    const out = await traceRedirects('https://h0.example/', { maxHops: 3, timeoutMs: 4000 });
    expect((out as any).capped).toBe(true);
    expect((out as any).status).toBe('warn');
    expect((out as any).hops).toHaveLength(3);
  });
});
