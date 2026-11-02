import type { ContentStatus, OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

export type VerificationTrack = 'global' | 'organization';

export interface VerificationStatusBadge {
  label: string;
  className: string;
}

const WARNING = 'bg-status-warning-muted text-status-warning border-status-warning/20';
const SUCCESS = 'bg-status-success-muted text-status-success border-status-success/20';
const PRIMARY = 'bg-primary/10 text-primary border-primary/20';
const NEUTRAL = 'bg-muted text-muted-foreground';

const GLOBAL_BADGES: Partial<Record<ContentStatus, VerificationStatusBadge>> = {
  PENDING_REVIEW: { label: 'Oczekuje', className: WARNING },
  CHANGES_REQUESTED: { label: 'Do poprawy', className: WARNING },
  APPROVED: { label: 'Zatwierdzony', className: SUCCESS },
  PUBLISHED: { label: 'Opublikowany', className: PRIMARY },
};

const ORGANIZATION_BADGES: Record<OrganizationVerificationStatus, VerificationStatusBadge> = {
  NOT_SUBMITTED: { label: 'Szkic', className: NEUTRAL },
  PENDING_ORG_REVIEW: { label: 'Oczekuje', className: WARNING },
  ORG_CHANGES_REQUESTED: { label: 'Do poprawy', className: WARNING },
  ORG_VERIFIED: { label: 'Zweryfikowane', className: SUCCESS },
  ORG_ARCHIVED: { label: 'Zarchiwizowane', className: NEUTRAL },
};

const DRAFT_BADGE: VerificationStatusBadge = { label: 'Szkic', className: NEUTRAL };

/** Status badge for a queue card; organization queues read the organization track, not the global `status`. */
export function getVerificationStatusBadge(
  exercise: { status: ContentStatus; organizationVerificationStatus?: OrganizationVerificationStatus | null },
  track: VerificationTrack
): VerificationStatusBadge {
  if (track === 'organization' && exercise.organizationVerificationStatus) {
    return ORGANIZATION_BADGES[exercise.organizationVerificationStatus];
  }
  return GLOBAL_BADGES[exercise.status] ?? DRAFT_BADGE;
}
