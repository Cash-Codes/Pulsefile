import { describe, it, expect } from 'vitest';
import { computeCompositeScore } from './score';
import type { PulseReportChecks } from '../shared/pulseReport';

describe('computeCompositeScore', () => {
  it('returns A=100 when all checks ok', () => {
    const checks: PulseReportChecks = {
      http: { status: 'ok', httpStatus: 200, responseSizeBytes: 1, latencyMs: 1 },
      content: { status: 'na', expected: null, matched: false, snippet: null },
      securityHeaders: { status: 'ok', scoreOutOf100: 100, headers: [] },
      timing: { status: 'ok', dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 1, totalMs: 1 },
      ssl: { status: 'ok', classification: 'healthy', subject: '', issuer: '', validFrom: '', validTo: '', daysUntilExpiry: 90, sanList: [] },
      redirects: { status: 'ok', hops: [], finalUrl: '', capped: false },
    };
    const out = computeCompositeScore(checks);
    expect(out.scoreOutOf100).toBe(100);
    expect(out.grade).toBe('A');
  });

  it('returns F when http fails and ssl expired', () => {
    const checks: PulseReportChecks = {
      http: { status: 'fail', httpStatus: 503, responseSizeBytes: 0, latencyMs: 1 },
      content: { status: 'fail', expected: 'x', matched: false, snippet: null },
      securityHeaders: { status: 'fail', scoreOutOf100: 0, headers: [] },
      timing: { status: 'ok', dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 1, totalMs: 1 },
      ssl: { status: 'fail', classification: 'expired', subject: '', issuer: '', validFrom: '', validTo: '', daysUntilExpiry: -1, sanList: [] },
      redirects: { status: 'ok', hops: [], finalUrl: '', capped: false },
    };
    const out = computeCompositeScore(checks);
    expect(out.scoreOutOf100).toBeLessThan(50);
    expect(out.grade).toBe('F');
  });

  it('error checks are treated as 0 for that dimension', () => {
    const checks: PulseReportChecks = {
      http: { status: 'ok', httpStatus: 200, responseSizeBytes: 1, latencyMs: 1 },
      content: { status: 'na', expected: null, matched: false, snippet: null },
      securityHeaders: { status: 'ok', scoreOutOf100: 100, headers: [] },
      timing: { status: 'ok', dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 1, totalMs: 1 },
      ssl: { status: 'error', code: 'tls_unreachable', message: 'x' },
      redirects: { status: 'ok', hops: [], finalUrl: '', capped: false },
    };
    const out = computeCompositeScore(checks);
    expect(out.scoreOutOf100).toBeLessThan(100);
    expect(out.scoreOutOf100).toBeGreaterThan(50);
  });
});
