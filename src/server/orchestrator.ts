import type { PulseReport, PulseReportChecks, CheckErrorOutcome } from '../shared/pulseReport.js';
import { validateAndPin } from './ssrfGuard.js';
import { baseFetch } from './network/baseFetch.js';
import { tlsConnect, type ParsedCert } from './network/tlsConnect.js';
import { runHttpCheck } from '../checks/runHttpCheck.js';
import { matchContent } from '../checks/matchContent.js';
import { auditSecurityHeaders } from '../checks/auditSecurityHeaders.js';
import { timingBreakdown } from '../checks/timingBreakdown.js';
import { inspectTls } from '../checks/inspectTls.js';
import { traceRedirects } from '../checks/traceRedirects.js';
import { computeCompositeScore } from '../checks/score.js';

export interface PulseInput {
  url: string;
  expect: string | null;
}

export interface OrchestratorOpts {
  maxRedirectHops: number;
  checkTimeoutMs: number;
}

export async function runPulse(input: PulseInput, opts: OrchestratorOpts): Promise<PulseReport> {
  const startedAt = Date.now();
  const validated = await validateAndPin(input.url);

  const [baseSettled, tlsSettled, redirectsSettled] = await Promise.allSettled([
    baseFetch(validated, { timeoutMs: opts.checkTimeoutMs }),
    validated.scheme === 'https'
      ? tlsConnect(validated.host, validated.port, { timeoutMs: opts.checkTimeoutMs })
      : Promise.reject(new Error('not_https')),
    traceRedirects(validated.original, { maxHops: opts.maxRedirectHops, timeoutMs: opts.checkTimeoutMs }),
  ]);

  const checks: PulseReportChecks = {
    http: deriveHttp(baseSettled, input.expect),
    content: deriveContent(baseSettled, input.expect),
    securityHeaders: deriveHeaders(baseSettled),
    timing: deriveTiming(baseSettled),
    ssl: inspectTls(toTlsCapture(tlsSettled)),
    redirects: redirectsSettled.status === 'fulfilled'
      ? redirectsSettled.value
      : redirectError(redirectsSettled.reason),
  };

  return {
    requestedUrl: validated.original,
    resolvedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    composite: computeCompositeScore(checks),
    checks,
  };
}

function deriveHttp(settled: PromiseSettledResult<Awaited<ReturnType<typeof baseFetch>>>, expect: string | null) {
  if (settled.status === 'rejected') {
    return { status: 'error', code: 'http_failed', message: String(settled.reason) } satisfies CheckErrorOutcome;
  }
  const matched = expect ? settled.value.body.includes(expect) : null;
  return runHttpCheck({
    statusCode: settled.value.statusCode,
    latencyMs: settled.value.timing.totalMs,
    bodyBytes: settled.value.bodyBytes,
    expectedMatched: matched,
  });
}

function deriveContent(settled: PromiseSettledResult<Awaited<ReturnType<typeof baseFetch>>>, expect: string | null) {
  if (settled.status === 'rejected') {
    return { status: 'error', code: 'http_failed', message: String(settled.reason) } satisfies CheckErrorOutcome;
  }
  return matchContent({ body: settled.value.body, expect });
}

function deriveHeaders(settled: PromiseSettledResult<Awaited<ReturnType<typeof baseFetch>>>) {
  if (settled.status === 'rejected') {
    return { status: 'error', code: 'http_failed', message: String(settled.reason) } satisfies CheckErrorOutcome;
  }
  return auditSecurityHeaders({ headers: settled.value.headers });
}

function deriveTiming(settled: PromiseSettledResult<Awaited<ReturnType<typeof baseFetch>>>) {
  if (settled.status === 'rejected') {
    return { status: 'error', code: 'http_failed', message: String(settled.reason) } satisfies CheckErrorOutcome;
  }
  return timingBreakdown({ timing: settled.value.timing });
}

function toTlsCapture(settled: PromiseSettledResult<ParsedCert>) {
  if (settled.status === 'fulfilled') return { status: 'fulfilled' as const, value: settled.value };
  return { status: 'rejected' as const, reason: settled.reason };
}

function redirectError(reason: unknown): CheckErrorOutcome {
  return { status: 'error', code: 'redirect_failed', message: String(reason) };
}
