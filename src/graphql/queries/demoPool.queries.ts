import { gql } from '@apollo/client';

// Pula demo (fizjo-app#388). API sprzed #388 nie zna pola `availability`, więc te dokumenty idą osobno,
// z errorPolicy 'ignore' i dopiero po potwierdzeniu puli demo gabinetu: ich błąd nie dotyka biblioteki ani wybieraków.

// Znaczki „Demo”: identyfikatory z tej samej widoczności co biblioteka gabinetu. `availableExercises` oddaje
// najwyżej 5000 rekordów na okno, stąd dwa okna. API sprzed fizjo-app#534 nakładało `where` na okno (zasięg:
// pierwsze 10 000 ćwiczeń biblioteki); nowsze filtruje przed oknem, więc okna mieszczą 10 000 rekordów demo. Pobierane leniwie, dopiero gdy ekran
// pokazuje znaczki (DemoPoolQueryProvider).
export const GET_DEMO_EXERCISE_IDS_QUERY = gql`
  query GetDemoExerciseIds($organizationId: String!) {
    firstWindow: availableExercises(
      organizationId: $organizationId
      skip: 0
      take: 5000
      where: { availability: { eq: DEMO } }
    ) {
      id
      availability
    }
    secondWindow: availableExercises(
      organizationId: $organizationId
      skip: 5000
      take: 5000
      where: { availability: { eq: DEMO } }
    ) {
      id
      availability
    }
  }
`;
