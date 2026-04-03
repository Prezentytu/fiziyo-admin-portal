import { gql } from '@apollo/client';

/**
 * Subskrypcje dla członkostw organizacji.
 */
export const ON_MEMBER_CREATED = gql`
  subscription OnMemberCreated($organizationId: String!) {
    onMemberCreated(organizationId: $organizationId)
  }
`;
