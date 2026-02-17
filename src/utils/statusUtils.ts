/**
 * Utility functions for status translations and mappings
 */

export type AssignmentStatus = 'assigned' | 'active' | 'paused' | 'completed' | 'cancelled';

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
    case 'inactive':
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
}
