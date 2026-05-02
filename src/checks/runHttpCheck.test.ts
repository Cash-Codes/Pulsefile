import { describe, it, expect } from 'vitest';
import { runHttpCheck } from './runHttpCheck';

describe('runHttpCheck', () => {
  it('returns ok for 200 with no content expectation', () => {
    const out = runHttpCheck({ statusCode: 200, latencyMs: 120, bodyBytes: 1234, expectedMatched: null });
    expect(out.status).toBe('ok');
    expect(out.httpStatus).toBe(200);
    expect(out.latencyMs).toBe(120);
  });

  it('returns ok for 200 with matching content', () => {
    const out = runHttpCheck({ statusCode: 200, latencyMs: 100, bodyBytes: 500, expectedMatched: true });
    expect(out.status).toBe('ok');
  });

  it('returns warn for 3xx', () => {
    const out = runHttpCheck({ statusCode: 301, latencyMs: 80, bodyBytes: 0, expectedMatched: null });
    expect(out.status).toBe('warn');
  });

  it('returns fail for 4xx', () => {
    const out = runHttpCheck({ statusCode: 404, latencyMs: 90, bodyBytes: 100, expectedMatched: null });
    expect(out.status).toBe('fail');
  });

  it('returns fail for 5xx', () => {
    const out = runHttpCheck({ statusCode: 503, latencyMs: 200, bodyBytes: 0, expectedMatched: null });
    expect(out.status).toBe('fail');
  });
});
