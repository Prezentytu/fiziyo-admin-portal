/**
 * Utility functions for status translations and mappings
 */

export type AssignmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ActivityStatus = 'active' | 'inactive';
export type ExerciseSetStatus = 'active' | 'inactive' | 'templates';

/**
 * Translates assignment status to Polish
 */
export function translateAssignmentStatus(status: AssignmentStatus): string {
  switch (status) {
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
 * Translates activity status to Polish
 */
export function translateActivityStatus(status: ActivityStatus): string {
  switch (status) {
    case 'active':
      return 'Aktywny';
    case 'inactive':
      return 'Nieaktywny';
    default:
      return status;
  }
}

/**
 * Translates exercise set status to Polish
 */
export function translateExerciseSetStatus(status: ExerciseSetStatus): string {
  switch (status) {
    case 'active':
      return 'Aktywne';
    case 'inactive':
      return 'Nieaktywne';
    case 'templates':
      return 'Szablony';
    default:
      return status;
  }
}

/**
 * Translates filter status to Polish
 */
export function translateFilterStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktywnych';
    case 'inactive':
      return 'Nieaktywnych';
    case 'all':
      return 'Wszystkie';
    case 'templates':
      return 'Szablony';
    default:
      return status;
  }
}

/**
 * Gets status color class for badges
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'paused':
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'completed':
      return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-700 border-red-500/30';
    case 'inactive':
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
}


