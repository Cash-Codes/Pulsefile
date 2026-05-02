import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCertPem } from './tlsConnect';

const HEALTHY = readFileSync('fixtures/certs/healthy.pem', 'utf8');

describe('parseCertPem', () => {
  it('extracts subject CN, issuer, validityand SAN list from a healthy cert', () => {
    const parsed = parseCertPem(HEALTHY);
    expect(parsed.subject).toContain('CN=healthy.example');
    expect(parsed.issuer).toContain('CN=healthy.example');
    expect(new Date(parsed.validTo).getTime()).toBeGreaterThan(Date.now());
    expect(parsed.sanList).toContain('healthy.example');
    expect(parsed.sanList).toContain('www.healthy.example');
  });
});
