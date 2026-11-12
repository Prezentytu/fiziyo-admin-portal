import { gql } from '@apollo/client';

// Pula demo (fizjo-app#388). API sprzed #388 nie zna pola `availability`, więc te dokumenty idą osobno,
// z errorPolicy 'ignore' i dopiero po potwierdzeniu puli demo gabinetu: ich błąd nie dotyka biblioteki ani wybieraków.

// Znaczki „Demo”: identyfikatory z tej samej widoczności co biblioteka gabinetu. `availableExercises` oddaje
// najwyżej 5000 rekordów na okno, stąd dwa okna (10 000 rekordów); dalej znaczka nie ma.
export const GET_DEMO_EXERCISE_IDS_QUERY = gql`
  query GetDemoExerciseIds($organizationId: String!) {
    firstWindow: availableExercises(organizationId: $organizationId, skip: 0, take: 5000) {
      id
      availability
    }
    secondWindow: availableExercises(organizationId: $organizationId, skip: 5000, take: 5000) {
      id
      availability
    }
  }
`;
