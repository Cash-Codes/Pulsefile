import type { TimingBreakdownResult } from '../shared/pulseReport.js';
import type { TimingBreakdown } from '../server/network/baseFetch.js';

export interface TimingInput {
  timing: TimingBreakdown;
}

export function timingBreakdown(input: TimingInput): TimingBreakdownResult {
  return {
    status: 'ok',
    dnsMs: input.timing.dnsMs,
    tcpMs: input.timing.tcpMs,
    tlsMs: input.timing.tlsMs,
    ttfbMs: input.timing.ttfbMs,
    totalMs: input.timing.totalMs,
  };
}
