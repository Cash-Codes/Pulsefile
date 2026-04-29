import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { baseFetch } from './baseFetch';
import type { ValidatedUrl } from '../ssrfGuard';

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

const target: ValidatedUrl = {
  original: 'https://example.com/path',
  host: 'example.com',
  port: 443,
  scheme: 'https',
  pathname: '/path',
  resolvedIp: '93.184.216.34',
};

describe('baseFetch', () => {
  it('captures status, headers, bodyand timing', async () => {
    const pool = mock.get('https://example.com');
    pool.intercept({ path: '/path', method: 'GET' }).reply(
      200,
      '<html><head><title>Hi</title></head><body>ok</body></html>',
      { headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=63072000' } },
    );
    const result = await baseFetch(target, { timeoutMs: 4000 });
    expect(result.statusCode).toBe(200);
    expect(result.headers['content-type']).toBe('text/html');
    expect(result.headers['strict-transport-security']).toBe('max-age=63072000');
    expect(result.body).toContain('<title>Hi</title>');
    expect(result.bodyBytes).toBeGreaterThan(0);
    expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('returns the captured body as a string', async () => {
    const pool = mock.get('https://example.com');
    pool.intercept({ path: '/path', method: 'GET' }).reply(404, 'not found', {
      headers: { 'content-type': 'text/plain' },
    });
    const result = await baseFetch(target, { timeoutMs: 4000 });
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe('not found');
  });
});
