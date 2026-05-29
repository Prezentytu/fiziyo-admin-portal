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

/**
 * Gets status color class for badges
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'assigned':
      return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'active':
      return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'paused':
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'completed':
      return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-700 border-red-500/30';
    case 'in_progress':
      return 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30';
    case 'expired':
      return 'bg-red-500/20 text-red-700 border-red-500/30';
    case 'inactive':
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
}
