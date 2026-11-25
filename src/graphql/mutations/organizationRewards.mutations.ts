import { gql, type TypedDocumentNode } from '@apollo/client';
import type { CabinetReward, RewardSettings, RewardTerms } from '@/graphql/types';

export const UPDATE_REWARD_SETTINGS_MUTATION: TypedDocumentNode<
  { updateOrganizationRewardSettings: { rewardsEnabled: boolean } },
  { input: Partial<Pick<RewardSettings, 'rewardsEnabled' | 'recognitionPoints' | 'enabledBadges'>> }
> = gql`
  mutation UpdateRewardSettings($input: UpdateOrganizationRewardSettingsInput!) {
    updateOrganizationRewardSettings(input: $input) {
      rewardsEnabled
    }
  }
`;

export const ENABLE_REWARD_STARTER_PACK_MUTATION = gql`
  mutation EnableRewardStarterPack {
    enableOrganizationRewardStarterPack {
      id
    }
  }
`;

export const CREATE_REWARD_MUTATION: TypedDocumentNode<
  { createOrganizationReward: { id: string } },
  { input: { templateId: string; activate: boolean } }
> = gql`
  mutation CreateReward($input: CreateOrganizationRewardInput!) {
    createOrganizationReward(input: $input) {
      id
    }
  }
`;

export const SET_REWARD_STATUS_MUTATION: TypedDocumentNode<
  { setOrganizationRewardStatus: { id: string } },
  { id: string; status: CabinetReward['status'] }
> = gql`
  mutation SetRewardStatus($id: ID!, $status: OrganizationRewardStatus!) {
    setOrganizationRewardStatus(id: $id, status: $status) {
      id
    }
  }
`;

export const UPDATE_REWARD_TERMS_MUTATION: TypedDocumentNode<
  { updateOrganizationReward: { id: string } },
  { input: RewardTerms & { id: string } }
> = gql`
  mutation UpdateRewardTerms($input: UpdateOrganizationRewardInput!) {
    updateOrganizationReward(input: $input) {
      id
    }
  }
`;

export const ANSWER_REWARD_ENVELOPE_MUTATION: TypedDocumentNode<
  { answerOrganizationRewardEnvelope: { id: string } },
  { redemptionId: string; text: string; exerciseId?: string }
> = gql`
  mutation AnswerRewardEnvelope($redemptionId: ID!, $text: String!, $exerciseId: ID) {
    answerOrganizationRewardEnvelope(redemptionId: $redemptionId, text: $text, exerciseId: $exerciseId) {
      id
    }
  }
`;

export const AWARD_RECOGNITION_BADGE_MUTATION: TypedDocumentNode<
  { awardRecognitionBadge: { id: string } },
  { patientId: string; badgeKey: string }
> = gql`
  mutation AwardRecognitionBadge($patientId: ID!, $badgeKey: String!) {
    awardRecognitionBadge(patientId: $patientId, badgeKey: $badgeKey) {
      id
    }
  }
`;
