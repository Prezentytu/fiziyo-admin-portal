import { gql } from "@apollo/client";

// Fragment dla podstawowych danych mapowania
export const EXERCISE_SET_MAPPING_BASIC_FRAGMENT = gql`
  fragment ExerciseSetMappingBasicFragment on ExerciseSetMapping {
    id
    exerciseSetId
    exerciseId
    order
  }
`;

// Fragment dla pełnych danych mapowania
export const EXERCISE_SET_MAPPING_FULL_FRAGMENT = gql`
  fragment ExerciseSetMappingFullFragment on ExerciseSetMapping {
    id
    exerciseSetId
    exerciseId
    order
    sets
    reps
    duration
    restSets
    restReps
    executionTime
    tempo
    notes
    customName
    customDescription
    exercise {
      id
      name
      patientDescription
      type
      side
      imageUrl
      thumbnailUrl
      defaultExecutionTime
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
    }
  }
`;

// Query do pobierania listy mapowań
export const GET_EXERCISE_SET_MAPPINGS_QUERY = gql`
  query GetExerciseSetMappings {
    exerciseSetMappings {
      id
      exerciseSetId
      exerciseId
      order
    }
  }
`;

// Query do pobierania mapowań dla konkretnego zestawu
export const GET_EXERCISE_SET_MAPPINGS_BY_SET_QUERY = gql`
  query GetExerciseSetMappingsBySet($exerciseSetId: String!) {
    exerciseSetMappings(where: { exerciseSetId: { eq: $exerciseSetId } }) {
      ...ExerciseSetMappingFullFragment
    }
  }
  ${EXERCISE_SET_MAPPING_FULL_FRAGMENT}
`;

// Query do pobierania pojedynczego mapowania
export const GET_EXERCISE_SET_MAPPING_BY_ID_QUERY = gql`
  query GetExerciseSetMappingById($id: String!) {
    exerciseSetMappingById(id: $id) {
      ...ExerciseSetMappingFullFragment
    }
  }
  ${EXERCISE_SET_MAPPING_FULL_FRAGMENT}
`;
