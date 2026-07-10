import { gql } from '@apollo/client';

// Notatki dziennika pacjenta udostępnione fizjoterapeucie (visibility === SHARED_WITH_THERAPIST).
// Backend filtruje twardo po Visibility — wpisy PRIVATE nigdy nie są zwracane.
export const GET_PATIENT_SHARED_JOURNAL_ENTRIES_QUERY = gql`
  query GetPatientSharedJournalEntries($patientId: String!, $organizationId: String!, $limit: Int) {
    patientSharedJournalEntries(patientId: $patientId, organizationId: $organizationId, limit: $limit) {
      id
      patientId
      organizationId
      title
      content
      entryDate
      visibility
      createdAt
      updatedAt
    }
  }
`;
