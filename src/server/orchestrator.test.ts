import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';

vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn() },
  lookup: vi.fn(),
}));
import dns from 'node:dns/promises';
const mockLookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;

import { runPulse } from './orchestrator';

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

describe('runPulse', () => {
  it('rejects SSRF (private IP) before any network', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      runPulse({ url: 'http://localhost/', expect: null }, { maxRedirectHops: 10, checkTimeoutMs: 1000 }),
    ).rejects.toMatchObject({ name: 'SsrfError' });
  });

  it('produces a complete report shape on a happy path', async () => {
    const pool = mock.get('https://pulse.example.invalid');
    pool.intercept({ path: '/', method: 'GET' }).reply(200, '<html><title>ok</title></html>', {
      headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=63072000' },
    });
    pool.intercept({ path: '/', method: 'HEAD' }).reply(200, '');
    // tlsConnect will fail (mock agent doesn't speak TLS) - we expect ssl to be an error outcome
    const report = await runPulse(
      { url: 'https://pulse.example.invalid/', expect: null },
      { maxRedirectHops: 10, checkTimeoutMs: 1000 },
    );
    expect(report.requestedUrl).toBe('https://pulse.example.invalid/');
    expect(report.checks.http.status).toBe('ok');
    expect(report.checks.content.status).toBe('na');
    expect(report.checks.securityHeaders.status).toBeDefined();
    expect(report.checks.timing.status).toBe('ok');
    expect(report.checks.ssl.status).toBe('error');
    expect(report.checks.redirects.status).toBe('ok');
    expect(report.composite.grade).toBeDefined();
  });
});
