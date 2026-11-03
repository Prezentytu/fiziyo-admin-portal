import type { ContentStatus, OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

export type VerificationTrack = 'global' | 'organization';

export interface VerificationStatusBadge {
  label: string;
  /** Color of the dot in front of the label. */
  dotClassName: string;
}

const WARNING = 'bg-status-warning';
const SUCCESS = 'bg-status-success';
const PRIMARY = 'bg-primary';
const NEUTRAL = 'bg-muted-foreground';

const GLOBAL_BADGES: Partial<Record<ContentStatus, VerificationStatusBadge>> = {
  PENDING_REVIEW: { label: 'Oczekuje', dotClassName: WARNING },
  CHANGES_REQUESTED: { label: 'Do poprawy', dotClassName: WARNING },
  APPROVED: { label: 'Zatwierdzony', dotClassName: SUCCESS },
  PUBLISHED: { label: 'Opublikowany', dotClassName: PRIMARY },
};

const ORGANIZATION_BADGES: Record<OrganizationVerificationStatus, VerificationStatusBadge> = {
  NOT_SUBMITTED: { label: 'Szkic', dotClassName: NEUTRAL },
  PENDING_ORG_REVIEW: { label: 'Oczekuje', dotClassName: WARNING },
  ORG_CHANGES_REQUESTED: { label: 'Do poprawy', dotClassName: WARNING },
  ORG_VERIFIED: { label: 'Zweryfikowane', dotClassName: SUCCESS },
  ORG_ARCHIVED: { label: 'Zarchiwizowane', dotClassName: NEUTRAL },
};

const DRAFT_BADGE: VerificationStatusBadge = { label: 'Szkic', dotClassName: NEUTRAL };

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
