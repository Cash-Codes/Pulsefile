import { describe, it, expect } from 'vitest';
import { matchContent } from './matchContent';

describe('matchContent', () => {
  it('returns na when no expectation provided', () => {
    const out = matchContent({ body: '<html><title>foo</title></html>', expect: null });
    expect(out.status).toBe('na');
    expect(out.matched).toBe(false);
    expect(out.expected).toBeNull();
  });

  it('returns ok when expected substring present', () => {
    const out = matchContent({ body: 'all systems operational', expect: 'operational' });
    expect(out.status).toBe('ok');
    expect(out.matched).toBe(true);
    expect(out.expected).toBe('operational');
    expect(out.snippet).toContain('operational');
  });

  it('returns fail when expected substring absent', () => {
    const out = matchContent({ body: '<html><title>oops</title></html>', expect: 'all good' });
    expect(out.status).toBe('fail');
    expect(out.matched).toBe(false);
  });

  it('match is case-sensitive', () => {
    const out = matchContent({ body: 'Operational', expect: 'operational' });
    expect(out.matched).toBe(false);
  });
});
