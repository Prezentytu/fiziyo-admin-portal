import type { AssignmentStatusGql } from '@/graphql/types';

/**
 * Utility functions for status translations and mappings
 */

export type AssignmentStatus = 'assigned' | 'active' | 'paused' | 'completed' | 'cancelled' | 'in_progress' | 'expired';
type AssignmentStatusForMutation = Exclude<AssignmentStatus, 'expired'>;

const assignmentStatusToGqlMap: Record<AssignmentStatusForMutation, AssignmentStatusGql> = {
  assigned: 'ASSIGNED',
  active: 'ACTIVE',
  paused: 'PAUSED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  in_progress: 'IN_PROGRESS',
};

const gqlStatusToAssignmentMap: Record<AssignmentStatusGql, AssignmentStatus> = {
  ASSIGNED: 'assigned',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  IN_PROGRESS: 'in_progress',
};

/**
 * Converts lowercase DB/UI status to GraphQL enum status.
 */
export function toGqlStatus(status: AssignmentStatusForMutation): AssignmentStatusGql {
  return assignmentStatusToGqlMap[status];
}

/**
 * Converts GraphQL enum status to lowercase UI status.
 */
export function fromGqlStatus(status: AssignmentStatusGql): AssignmentStatus {
  return gqlStatusToAssignmentMap[status];
}

/**
 * Translates assignment status to Polish
 */
export function translateAssignmentStatus(status: AssignmentStatus): string {
  switch (status) {
    case 'assigned':
      return 'Przypisany';
    case 'active':
      return 'Aktywny';
    case 'paused':
      return 'Wstrzymany';
    case 'completed':
      return 'Zakończony';
    case 'cancelled':
      return 'Anulowany';
    case 'in_progress':
      return 'W trakcie';
    case 'expired':
      return 'Wygasł';
    default:
      return status;
  }
}

const STATUS_TONE_CLASSES = {
  success: 'bg-status-success-muted text-status-success border-transparent',
  warning: 'bg-status-warning-muted text-status-warning border-transparent',
  danger: 'bg-status-danger-muted text-status-danger border-transparent',
  info: 'bg-status-info-muted text-status-info border-transparent',
  neutral: 'bg-fill-tertiary text-label-secondary border-transparent',
} as const;

/**
 * Gets status color class for badges (DS v4 status tokens, theme-safe)
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'active':
      return STATUS_TONE_CLASSES.success;
    case 'assigned':
    case 'in_progress':
      return STATUS_TONE_CLASSES.info;
    case 'paused':
      return STATUS_TONE_CLASSES.warning;
    case 'cancelled':
    case 'expired':
      return STATUS_TONE_CLASSES.danger;
    default:
      return STATUS_TONE_CLASSES.neutral;
  }
}
