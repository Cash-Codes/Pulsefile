import type {
  CheckOutcome,
  CompositeScore,
  Grade,
  PulseReportChecks,
} from '../shared/pulseReport.js';

const WEIGHTS = {
  http: 30,
  ssl: 25,
  securityHeaders: 20,
  redirects: 10,
  content: 10,
  timing: 5,
} as const;

function statusToScore(status: 'ok' | 'warn' | 'fail' | 'na' | 'error'): number {
  if (status === 'ok' || status === 'na') return 1;
  if (status === 'warn') return 0.5;
  return 0;
}

function outcomeStatus<T extends { status: string }>(outcome: CheckOutcome<T>): 'ok' | 'warn' | 'fail' | 'na' | 'error' {
  if ((outcome as any).status === 'error') return 'error';
  return (outcome as T).status as any;
}

export function computeCompositeScore(checks: PulseReportChecks): CompositeScore {
  let total = 0;
  total += WEIGHTS.http * statusToScore(outcomeStatus(checks.http));
  total += WEIGHTS.ssl * statusToScore(outcomeStatus(checks.ssl));
  total += WEIGHTS.securityHeaders * statusToScore(outcomeStatus(checks.securityHeaders));
  total += WEIGHTS.redirects * statusToScore(outcomeStatus(checks.redirects));
  total += WEIGHTS.content * statusToScore(outcomeStatus(checks.content));
  total += WEIGHTS.timing * statusToScore(outcomeStatus(checks.timing));
  const scoreOutOf100 = Math.round(total);
  return { scoreOutOf100, grade: toGrade(scoreOutOf100) };
}

function toGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}
