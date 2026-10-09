import { gql } from '@apollo/client';

/**
 * Subskrypcje dla przypisań pacjentów do fizjoterapeutów.
 */
export const ON_THERAPIST_ASSIGNMENT_CREATED = gql`
  subscription OnTherapistAssignmentCreated($organizationId: String!) {
    onTherapistAssignmentCreated(organizationId: $organizationId)
  }
`;
