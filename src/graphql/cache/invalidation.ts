import {
  GET_AVAILABLE_EXERCISES_LIST_QUERY,
  GET_AVAILABLE_EXERCISES_QUERY,
  GET_ORGANIZATION_EXERCISES_QUERY,
} from '@/graphql/queries/exercises.queries';
import {
  GET_ORGANIZATION_EXERCISE_SETS_LIST_QUERY,
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
} from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import {
  GET_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  GET_ORGANIZATION_INVITATIONS_QUERY,
  GET_ORGANIZATION_INVITATION_STATS_QUERY,
} from '@/graphql/queries/organizations.queries';
import { GET_USER_ORGANIZATIONS_QUERY } from '@/graphql/queries/users.queries';

export function exerciseListRefetch(organizationId: string) {
  return [
    { query: GET_AVAILABLE_EXERCISES_LIST_QUERY, variables: { organizationId } },
    { query: GET_AVAILABLE_EXERCISES_QUERY, variables: { organizationId } },
    { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
  ];
}

export function exerciseSetListRefetch(organizationId: string) {
  return [
    { query: GET_ORGANIZATION_EXERCISE_SETS_LIST_QUERY, variables: { organizationId } },
    { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
  ];
}

export function patientListRefetch(organizationId: string) {
  return [
    { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
    { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'my' } },
  ];
}

export function therapistAssignmentRefetch(assignedById: string) {
  return [{ query: GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY, variables: { assignedById } }];
}

export function verificationQueueRefetch() {
  return [
    { query: GET_VERIFICATION_STATS_QUERY },
    {
      query: GET_VERIFICATION_QUEUE_PAGE_QUERY,
      variables: { filter: 'pending', search: '', page: 1, pageSize: 20 },
    },
  ];
}

export function organizationInviteRefetch(organizationId?: string) {
  return [
    { query: GET_USER_ORGANIZATIONS_QUERY },
    ...(organizationId
      ? [
          { query: GET_ORGANIZATION_INVITATIONS_QUERY, variables: { organizationId } },
          { query: GET_ORGANIZATION_INVITATION_STATS_QUERY, variables: { organizationId } },
        ]
      : []),
  ];
}
