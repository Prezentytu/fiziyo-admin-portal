import type { BadgeProps } from '@/components/ui/badge';

export type AssignmentDisplayKind = 'active' | 'expiring_soon' | 'expired' | 'paused' | 'completed' | 'cancelled' | 'unknown';

export interface AssignmentDisplayBadge {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  kind: AssignmentDisplayKind;
}

export interface AssignmentDisplayStatusResult {
  primary: AssignmentDisplayBadge;
  secondary?: {
    label: string;
    variant: NonNullable<BadgeProps['variant']>;
  };
}

export interface ResolveAssignmentDisplayStatusInput {
  status?: string | null;
  endDate?: string | null;
  premiumValidUntil?: string | null;
  now?: Date;
}

const EXPIRING_SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeStatus(status?: string | null): string {
  return (status ?? '').trim().toLowerCase();
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPremiumActive(premiumValidUntil?: string | null, now: Date = new Date()): boolean {
  const premiumExpiry = parseDate(premiumValidUntil);
  if (!premiumExpiry) {
    return false;
  }
  return premiumExpiry.getTime() > now.getTime();
}

export function resolveAssignmentDisplayStatus({
  status,
  endDate,
  premiumValidUntil,
  now = new Date(),
}: ResolveAssignmentDisplayStatusInput): AssignmentDisplayStatusResult {
  const normalizedStatus = normalizeStatus(status);
  const end = parseDate(endDate);
  const expiredByDate = Boolean(end && end.getTime() < now.getTime());

  let primary: AssignmentDisplayBadge;

  if (normalizedStatus === 'expired' || expiredByDate) {
    primary = { label: 'Wygasł', variant: 'destructive', kind: 'expired' };
  } else if (normalizedStatus === 'paused') {
    primary = { label: 'Wstrzymany', variant: 'warning', kind: 'paused' };
  } else if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
    primary = { label: 'Zakończony', variant: 'secondary', kind: 'completed' };
  } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    primary = { label: 'Anulowany', variant: 'destructive', kind: 'cancelled' };
  } else if (end) {
    const daysToEnd = Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
    if (daysToEnd > 0 && daysToEnd <= EXPIRING_SOON_DAYS) {
      const suffix = daysToEnd === 1 ? 'dzień' : 'dni';
      primary = { label: `Wygasa za ${daysToEnd} ${suffix}`, variant: 'warning', kind: 'expiring_soon' };
    } else {
      primary = { label: 'Aktywny', variant: 'success', kind: 'active' };
    }
  } else if (
    normalizedStatus === 'assigned' ||
    normalizedStatus === 'active' ||
    normalizedStatus === 'in_progress' ||
    normalizedStatus === 'in-progress' ||
    normalizedStatus === 'inprogress' ||
    normalizedStatus === ''
  ) {
    primary = { label: 'Aktywny', variant: 'success', kind: 'active' };
  } else {
    primary = { label: 'Nieznany', variant: 'secondary', kind: 'unknown' };
  }

  const showMissingPremiumHint = primary.kind !== 'expired' && !isPremiumActive(premiumValidUntil, now);
  if (showMissingPremiumHint) {
    return {
      primary,
      secondary: {
        label: 'Brak Premium',
        variant: 'warning',
      },
    };
  }

  return { primary };
}
