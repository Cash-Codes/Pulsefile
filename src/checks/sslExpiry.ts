
export function daysUntilExpiry(validToIso: string): number {
  const expiry = new Date(validToIso);
  const now = new Date();
  // Compute days using local-time midnights so the count aligns with the user's calendar.
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = expiryMidnight.getTime() - nowMidnight.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function classify(daysLeft: number): 'healthy' | 'expiring_soon' | 'expired' {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 14) return 'expiring_soon';
  return 'healthy';
}
