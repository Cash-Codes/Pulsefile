import { describe, it, expect, vi } from 'vitest';
import { daysUntilExpiry } from './sslExpiry';

describe('daysUntilExpiry', () => {
  it('returns positive count for future date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const out = daysUntilExpiry('2026-04-15T12:00:00Z');
    expect(out).toBe(104);
    vi.useRealTimers();
  });

  it('returns 0 on the day of expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    const out = daysUntilExpiry('2026-04-15T18:00:00Z');
    expect(out).toBe(0);
    vi.useRealTimers();
  });

  it('returns negative count for past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    const out = daysUntilExpiry('2026-04-10T12:00:00Z');
    expect(out).toBe(-5);
    vi.useRealTimers();
  });
});
