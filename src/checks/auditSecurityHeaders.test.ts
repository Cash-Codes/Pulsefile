import { describe, it, expect } from 'vitest';
import { auditSecurityHeaders } from './auditSecurityHeaders';

describe('auditSecurityHeaders', () => {
  it('scores 100 when all six headers present', () => {
    const out = auditSecurityHeaders({
      headers: {
        'strict-transport-security': 'max-age=63072000',
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'permissions-policy': 'geolocation=()',
      },
    });
    expect(out.status).toBe('ok');
    expect(out.scoreOutOf100).toBe(100);
    expect(out.headers).toHaveLength(6);
    for (const h of out.headers) expect(h.present).toBe(true);
  });

  it('scores 0 when no headers present', () => {
    const out = auditSecurityHeaders({ headers: {} });
    expect(out.status).toBe('fail');
    expect(out.scoreOutOf100).toBe(0);
    for (const h of out.headers) expect(h.present).toBe(false);
  });

  it('warns when 3 of 6 present', () => {
    const out = auditSecurityHeaders({
      headers: {
        'strict-transport-security': 'max-age=1',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
      },
    });
    expect(out.scoreOutOf100).toBe(50);
    expect(out.status).toBe('warn');
  });
});
