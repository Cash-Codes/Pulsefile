import { describe, it, expect } from 'vitest';
import { timingBreakdown } from './timingBreakdown';

describe('timingBreakdown', () => {
  it('passes through timing values from baseFetch', () => {
    const out = timingBreakdown({
      timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 80, totalMs: 350 },
    });
    expect(out.status).toBe('ok');
    expect(out.ttfbMs).toBe(80);
    expect(out.totalMs).toBe(350);
  });
});
