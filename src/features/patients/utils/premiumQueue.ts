interface PremiumCandidate {
  premiumStatus?: 'FREE' | 'ACTIVE' | 'EXPIRED' | null;
  premiumValidUntil?: string | null;
  patient?: { isShadowUser?: boolean | null } | null;
}

function validUntilTime(candidate: PremiumCandidate): number | null {
  if (!candidate.premiumValidUntil) return null;
  const time = new Date(candidate.premiumValidUntil).getTime();
  return Number.isNaN(time) ? null : time;
}

export function hasActivePremium(candidate: PremiumCandidate, now: Date = new Date()): boolean {
  const until = validUntilTime(candidate);
  if (until !== null) return until > now.getTime();
  return candidate.premiumStatus === 'ACTIVE';
}

/**
 * Patients with an account but without active Premium: recently expired first, then never activated.
 */
export function getPremiumQueue<T extends PremiumCandidate>(patients: readonly T[], now: Date = new Date()): T[] {
  return patients
    .filter((candidate) => !candidate.patient?.isShadowUser && !hasActivePremium(candidate, now))
    .sort((left, right) => (validUntilTime(right) ?? -Infinity) - (validUntilTime(left) ?? -Infinity));
}
