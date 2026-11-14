import { gql } from '@apollo/client';

// Zdjęcie flagi demo przez recenzenta katalogu (fizjo-app, SPEC-051): ćwiczenie przechodzi z puli demo do zwykłej
// bazy. Backend odmawia z kodem EXERCISE_DEMO_STAYS, dopóki rekord nie ma własnego zdjęcia i własnego filmu.
export const RELEASE_EXERCISE_FROM_DEMO_POOL_MUTATION = gql`
  mutation ReleaseExerciseFromDemoPool($exerciseId: String!) {
    releaseExerciseFromDemoPool(exerciseId: $exerciseId) {
      id
      availability
    }
  }
`;
