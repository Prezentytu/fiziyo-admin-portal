import {
  GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
  GET_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import type { DocumentNode } from 'graphql';

export type VerificationScope = 'global' | 'organization' | 'crossOrg';

export interface VerificationQueueAdapter {
  scope: VerificationScope;
  title: string;
  description: string;
  statsQuery: DocumentNode;
  queueQuery: DocumentNode;
}

export const globalVerificationAdapter: VerificationQueueAdapter = {
  scope: 'global',
  title: 'Centrum Weryfikacji',
  description: 'Kolejka globalna ćwiczeń do recenzji.',
  statsQuery: GET_VERIFICATION_STATS_QUERY,
  queueQuery: GET_VERIFICATION_QUEUE_PAGE_QUERY,
};

export const organizationVerificationAdapter: VerificationQueueAdapter = {
  scope: 'organization',
  title: 'Weryfikacja organizacji',
  description: 'Ćwiczenia oczekujące na recenzję w Twojej organizacji.',
  statsQuery: GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
  queueQuery: GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
};

export const crossOrgVerificationAdapter: VerificationQueueAdapter = {
  scope: 'crossOrg',
  title: 'Weryfikacja organizacji',
  description: 'Kolejka cross-org dla super administratora.',
  statsQuery: GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
  queueQuery: GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
};

export function getVerificationAdapter(scope: VerificationScope): VerificationQueueAdapter {
  if (scope === 'organization') {
    return organizationVerificationAdapter;
  }
  if (scope === 'crossOrg') {
    return crossOrgVerificationAdapter;
  }
  return globalVerificationAdapter;
}
