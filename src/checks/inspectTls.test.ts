import { describe, it, expect, vi } from 'vitest';
import { inspectTls } from './inspectTls';
import type { ParsedCert } from '../server/network/tlsConnect';

const baseCert: ParsedCert = {
  subject: 'CN=example.com',
  issuer: 'CN=Example CA',
  validFrom: '2026-01-01T12:00:00Z',
  validTo: '2026-07-01T12:00:00Z',
  sanList: ['example.com'],
};

describe('inspectTls', () => {
  it('classifies healthy cert as ok', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
    const out = inspectTls({ status: 'fulfilled', value: baseCert });
    expect(out.status).toBe('ok');
    expect((out as any).classification).toBe('healthy');
    expect((out as any).daysUntilExpiry).toBeGreaterThan(14);
    vi.useRealTimers();
  });

  it('classifies cert expiring within 14 days as warn', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));
    const out = inspectTls({ status: 'fulfilled', value: baseCert });
    expect(out.status).toBe('warn');
    expect((out as any).classification).toBe('expiring_soon');
    vi.useRealTimers();
  });

  it('classifies expired cert as fail', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));
    const out = inspectTls({ status: 'fulfilled', value: baseCert });
    expect(out.status).toBe('fail');
    expect((out as any).classification).toBe('expired');
    vi.useRealTimers();
  });

  it('returns error outcome when tls capture rejected', () => {
    const out = inspectTls({ status: 'rejected', reason: new Error('tls_timeout') });
    expect(out.status).toBe('error');
    expect((out as any).code).toBe('tls_unreachable');
  });
});
