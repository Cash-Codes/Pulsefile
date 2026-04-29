import type { HttpCheckResult } from '../shared/pulseReport.js';

export interface RunHttpCheckInput {
  statusCode: number;
  latencyMs: number;
  bodyBytes: number;
  expectedMatched: boolean | null;
}

export function runHttpCheck(input: RunHttpCheckInput): HttpCheckResult {
  const code = input.statusCode;
  let status: HttpCheckResult['status'];
  if (code >= 200 && code < 300) {
    status = 'ok';
  } else if (code >= 300 && code < 400) {
    status = 'warn';
  } else {
    status = 'fail';
  }
  return {
    status,
    httpStatus: code,
    responseSizeBytes: input.bodyBytes,
    latencyMs: input.latencyMs,
  };
}
