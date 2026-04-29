import type { CheckErrorOutcome, SslResult } from '../shared/pulseReport.js';
import type { ParsedCert } from '../server/network/tlsConnect.js';
import { classify, daysUntilExpiry } from './sslExpiry.js';

export type TlsCapture =
  | { status: 'fulfilled'; value: ParsedCert }
  | { status: 'rejected'; reason: unknown };

export function inspectTls(capture: TlsCapture): SslResult | CheckErrorOutcome {
  if (capture.status === 'rejected') {
    return {
      status: 'error',
      code: 'tls_unreachable',
      message: 'Could not establish a TLS connection to inspect the certificate.',
    };
  }
  const cert = capture.value;
  const daysLeft = daysUntilExpiry(cert.validTo);
  const classification = classify(daysLeft);
  let status: SslResult['status'];
  if (classification === 'healthy') status = 'ok';
  else if (classification === 'expiring_soon') status = 'warn';
  else status = 'fail';
  return {
    status,
    classification,
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    daysUntilExpiry: daysLeft,
    sanList: cert.sanList,
  };
}
