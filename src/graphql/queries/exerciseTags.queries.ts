import { gql } from "@apollo/client";

// Fragment dla podstawowych danych tagu
export const EXERCISE_TAG_BASIC_FRAGMENT = gql`
  fragment ExerciseTagBasicFragment on ExerciseTag {
    id
    name
    color
    isActive
  }
`;

// Fragment dla pełnych danych tagu
export const EXERCISE_TAG_FULL_FRAGMENT = gql`
  fragment ExerciseTagFullFragment on ExerciseTag {
    id
    creationTime
    categoryId
    categoryIds
    name
    description
    color
    icon
    isActive
    isGlobal
    organizationId
    createdById
    popularity
    isMain
  }
`;

// Query do pobierania listy tagów
export const GET_EXERCISE_TAGS_QUERY = gql`
  query GetExerciseTags {
    exerciseTags {
      id
      name
      color
      isActive
    }
  }
`;

// Query do pobierania tagów dla organizacji
export const GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY = gql`
  query GetExerciseTagsByOrganization($organizationId: String!) {
    exerciseTags(where: { organizationId: { eq: $organizationId } }) {
      ...ExerciseTagFullFragment
    }
  }
  ${EXERCISE_TAG_FULL_FRAGMENT}
`;

// Query do pobierania aktywnych tagów
export const GET_ACTIVE_EXERCISE_TAGS_QUERY = gql`
  query GetActiveExerciseTags {
    exerciseTags(where: { isActive: { eq: true } }) {
      ...ExerciseTagBasicFragment
    }
  }
  ${EXERCISE_TAG_BASIC_FRAGMENT}
`;

// Query do pobierania pojedynczego tagu
export const GET_EXERCISE_TAG_BY_ID_QUERY = gql`
  query GetExerciseTagById($id: String!) {
    exerciseTagById(id: $id) {
      ...ExerciseTagFullFragment
    }
  }
  ${EXERCISE_TAG_FULL_FRAGMENT}
`;

// Query do pobierania mapowań tagów dla ćwiczenia
export const GET_EXERCISE_TAG_MAPPINGS_BY_EXERCISE_QUERY = gql`
  query GetExerciseTagMappingsByExercise($exerciseId: String!) {
    exerciseTagMappingsByExerciseId(exerciseId: $exerciseId) {
      id
      exerciseId
      tagId
      isMainTag
    }
  }
`;

// Query do pobierania pojedynczego mapowania tagu
export const GET_EXERCISE_TAG_MAPPING_BY_ID_QUERY = gql`
  query GetExerciseTagMappingById($id: String!) {
    exerciseTagMappingById(id: $id) {
      id
      exerciseId
      tagId
      isMainTag
      exercise {
        id
        name
      }
      tag {
        id
        name
        color
      }
    }
  }
`;
