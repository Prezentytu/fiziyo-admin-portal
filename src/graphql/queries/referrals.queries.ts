import { gql } from '@apollo/client';

// Polecenia fizjo (SPEC-054 w fizjo-app). Polecenie należy do osoby, więc zapytania nie niosą organizationId.
const REFERRAL_FIELDS_FRAGMENT = gql`
  fragment ReferralFields on ReferralView {
    id
    source
    status
    createdAt
    confirmedAt
    isActive
    referredName
    referredEmail
  }
`;

export const GET_MY_REFERRAL_PROGRAM_QUERY = gql`
  query GetMyReferralProgram {
    myReferralProgram {
      code
      confirmed
      active
      pending
    }
    myReferrals {
      ...ReferralFields
    }
  }
  ${REFERRAL_FIELDS_FRAGMENT}
`;

export const GET_MY_REFERRAL_SIDE_QUERY = gql`
  query GetMyReferralSide {
    myReferralRequests {
      id
      referrerName
      referrerOrganizationName
      createdAt
    }
    myReferrer {
      name
      confirmedAt
    }
  }
`;

export const GET_MY_REFERRAL_REQUESTS_QUERY = gql`
  query GetMyReferralRequests {
    myReferralRequests {
      id
      referrerName
      referrerOrganizationName
      createdAt
    }
  }
`;

export { REFERRAL_FIELDS_FRAGMENT };
