import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  CabinetReward,
  PatientRewards,
  RewardAssignment,
  RewardEnvelope,
  RewardSettings,
  RewardTemplate,
} from '@/graphql/types';

export const GET_REWARD_SETTINGS_QUERY: TypedDocumentNode<{ organizationRewardSettings: RewardSettings | null }> = gql`
  query GetRewardSettings {
    organizationRewardSettings {
      canManage
      rewardsEnabled
      pausedByFiziyo
      recognitionPoints
      badgePointsMax
      enabledBadges
      availableBadges
    }
  }
`;

export const GET_REWARD_CATALOG_QUERY: TypedDocumentNode<{
  organizationRewardTemplates: RewardTemplate[];
  organizationRewards: CabinetReward[];
}> = gql`
  query GetRewardCatalog {
    organizationRewardTemplates {
      id
      patientTitle
      portalDescription
      kind
      defaultCost
      minCost
      maxCost
      usable
    }
    organizationRewards {
      id
      templateId
      title
      portalDescription
      kind
      cost
      status
      frequency
      frequencyDays
      monthlyCap
    }
  }
`;

const ENVELOPE_FIELDS = gql`
  fragment PortalEnvelopeFields on OrganizationRewardQueueItem {
    id
    title
    patientId
    patientName
    dueAt
    overdue
    requiresExercise
    sentenceStarters
    answerText
    exerciseName
  }
`;

export const GET_REWARD_QUEUE_QUERY: TypedDocumentNode<{ organizationRewardQueue: RewardEnvelope[] }> = gql`
  query GetRewardQueue {
    organizationRewardQueue {
      ...PortalEnvelopeFields
    }
  }
  ${ENVELOPE_FIELDS}
`;

export const GET_PATIENT_REWARDS_QUERY: TypedDocumentNode<
  { patientOrganizationRewards: PatientRewards },
  { patientId: string }
> = gql`
  query GetPatientRewards($patientId: ID!) {
    patientOrganizationRewards(patientId: $patientId) {
      balance
      rewardsEnabled
      enabledBadges
      badgePoints
      canAwardBadge
      nextBadgeAt
      badges {
        id
        badgeKey
        awardedByName
        awardedAt
        points
      }
      envelopes {
        ...PortalEnvelopeFields
      }
    }
  }
  ${ENVELOPE_FIELDS}
`;

export const GET_REWARD_EXERCISES_QUERY: TypedDocumentNode<
  { patientAssignments: RewardAssignment[] },
  { patientId: string; organizationId: string }
> = gql`
  query GetRewardExercises($patientId: String!, $organizationId: String!) {
    patientAssignments(where: { userId: { eq: $patientId }, organizationId: { eq: $organizationId } }) {
      exercise {
        id
        name
      }
      exerciseSet {
        exerciseMappings {
          id
          customName
          exercise {
            id
            name
          }
        }
      }
      exerciseOverrides
    }
  }
`;
