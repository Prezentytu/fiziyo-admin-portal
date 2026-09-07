import type { TypePolicies } from '@apollo/client';

export const possibleTypes: Record<string, string[]> = {};

export const typePolicies: TypePolicies = {
  Query: {
    fields: {
      organizationPatients: {
        keyArgs: ['organizationId', 'filter'],
      },
      availableExercises: {
        keyArgs: ['organizationId'],
      },
      organizationExercises: {
        keyArgs: ['organizationId'],
      },
      organizationExerciseSets: {
        keyArgs: ['organizationId'],
      },
      exerciseSets: {
        keyArgs: ['where'],
      },
      patientAssignments: {
        keyArgs: ['where'],
      },
      verificationQueuePage: {
        keyArgs: ['filter', 'search', 'page', 'pageSize'],
      },
      organizationVerificationQueuePage: {
        keyArgs: ['organizationId', 'filter', 'search', 'page', 'pageSize'],
      },
    },
  },
};

export const apolloDefaultOptions = {
  watchQuery: {
    fetchPolicy: 'cache-and-network' as const,
    nextFetchPolicy: 'cache-first' as const,
  },
};
