
export type CheckStatus = 'ok' | 'warn' | 'fail' | 'error';

export interface CheckErrorOutcome {
  status: 'error';
  code: string;
  message: string;
}

export interface HttpCheckResult {
  status: 'ok' | 'warn' | 'fail';
  httpStatus: number;
  responseSizeBytes: number;
  latencyMs: number;
}

export interface ContentMatchResult {
  status: 'ok' | 'fail' | 'na';
  expected: string | null;
  matched: boolean;
  snippet: string | null;
}

export interface SecurityHeader {
  name: string;
  present: boolean;
  value: string | null;
  recommendation: string;
}

export interface SecurityHeadersResult {
  status: 'ok' | 'warn' | 'fail';
  scoreOutOf100: number;
  headers: SecurityHeader[];
}

export interface TimingBreakdownResult {
  status: 'ok';
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  totalMs: number;
}

export type SslClassification = 'healthy' | 'expiring_soon' | 'expired';

export interface SslResult {
  status: 'ok' | 'warn' | 'fail';
  classification: SslClassification;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  sanList: string[];
}

export interface RedirectHop {
  fromUrl: string;
  toUrl: string;
  status: number;
  latencyMs: number;
}

export interface RedirectsResult {
  status: 'ok' | 'warn' | 'fail';
  hops: RedirectHop[];
  finalUrl: string;
  capped: boolean;
}

export type CheckOutcome<T> = T | CheckErrorOutcome;

export interface PulseReportChecks {
  http: CheckOutcome<HttpCheckResult>;
  content: CheckOutcome<ContentMatchResult>;
  securityHeaders: CheckOutcome<SecurityHeadersResult>;
  timing: CheckOutcome<TimingBreakdownResult>;
  ssl: CheckOutcome<SslResult>;
  redirects: CheckOutcome<RedirectsResult>;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CompositeScore {
  scoreOutOf100: number;
  grade: Grade;
}

export interface PulseReport {
  requestedUrl: string;
  resolvedAt: string;
  durationMs: number;
  composite: CompositeScore;
  checks: PulseReportChecks;
}

export interface PulseRequestBody {
  url: string;
  expect?: string;
}
