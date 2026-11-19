import { gql } from '@apollo/client';

import { REFERRAL_FIELDS_FRAGMENT } from '../queries/referrals.queries';

export const REQUEST_REFERRAL_BY_EMAIL_MUTATION = gql`
  mutation RequestReferralByEmail($email: String!) {
    requestReferralByEmail(email: $email) {
      ...ReferralFields
    }
  }
  ${REFERRAL_FIELDS_FRAGMENT}
`;

export const CONFIRM_REFERRAL_MUTATION = gql`
  mutation ConfirmReferral($referralId: String!) {
    confirmReferral(referralId: $referralId) {
      name
      confirmedAt
    }
  }
`;

export const DECLINE_REFERRAL_MUTATION = gql`
  mutation DeclineReferral($referralId: String!) {
    declineReferral(referralId: $referralId)
  }
`;
