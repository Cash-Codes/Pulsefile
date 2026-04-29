import type { SecurityHeader, SecurityHeadersResult } from '../shared/pulseReport.js';

export interface AuditInput {
  headers: Record<string, string>;
}

interface HeaderSpec {
  name: string;
  recommendation: string;
}

const HEADERS: HeaderSpec[] = [
  { name: 'strict-transport-security', recommendation: 'Set HSTS with max-age >= 31536000 to enforce HTTPS.' },
  { name: 'content-security-policy', recommendation: "Set CSP starting with default-src 'self' to mitigate XSS." },
  { name: 'x-frame-options', recommendation: 'Set X-Frame-Options: DENY to prevent clickjacking.' },
  { name: 'x-content-type-options', recommendation: 'Set X-Content-Type-Options: nosniff to block MIME confusion.' },
  { name: 'referrer-policy', recommendation: 'Set Referrer-Policy (e.g. no-referrer or strict-origin) to limit referer leakage.' },
  { name: 'permissions-policy', recommendation: 'Set Permissions-Policy to restrict powerful browser features.' },
];

export function auditSecurityHeaders(input: AuditInput): SecurityHeadersResult {
  const headers: SecurityHeader[] = HEADERS.map((spec) => {
    const value = input.headers[spec.name] ?? null;
    return {
      name: spec.name,
      present: value !== null,
      value,
      recommendation: spec.recommendation,
    };
  });
  const presentCount = headers.filter((h) => h.present).length;
  const scoreOutOf100 = Math.round((presentCount / HEADERS.length) * 100);
  let status: SecurityHeadersResult['status'];
  if (scoreOutOf100 >= 80) status = 'ok';
  else if (scoreOutOf100 >= 40) status = 'warn';
  else status = 'fail';
  return { status, scoreOutOf100, headers };
}
