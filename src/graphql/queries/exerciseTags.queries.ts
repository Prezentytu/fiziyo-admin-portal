import { gql } from '@apollo/client';

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

// Query do pobierania tagów dla organizacji
export const GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY = gql`
  query GetExerciseTagsByOrganization($organizationId: String!) {
    exerciseTags(where: { organizationId: { eq: $organizationId } }) {
      ...ExerciseTagFullFragment
    }
  }
  ${EXERCISE_TAG_FULL_FRAGMENT}
`;
