import { gql } from "@apollo/client";

// Query do pobierania statystyk onboardingu
// Sprawdza czy użytkownik ma pacjentów, zestawy i przypisania
export const GET_ONBOARDING_STATS_QUERY = gql`
  query GetOnboardingStats($therapistId: String!, $organizationId: String!) {
    # Pacjenci przypisani do terapeuty
    therapistPatients(therapistId: $therapistId, organizationId: $organizationId) {
      id
    }
    # Zestawy ćwiczeń w organizacji
    exerciseSets(where: { organizationId: { eq: $organizationId }, isActive: { eq: true } }) {
      id
    }
    # Przypisania wykonane przez tego terapeutę
    patientAssignments(where: { assignedById: { eq: $therapistId } }) {
      id
    }
  }
`;


