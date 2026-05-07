export const ASSIGNMENT_STATUS_GQL = [
  'ASSIGNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'IN_PROGRESS',
] as const;

export type AssignmentStatusGql = (typeof ASSIGNMENT_STATUS_GQL)[number];
