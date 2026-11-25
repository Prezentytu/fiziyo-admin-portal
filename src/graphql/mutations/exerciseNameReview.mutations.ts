import { gql } from '@apollo/client';

import { EXERCISE_NAME_REVIEW_ROW_FRAGMENT } from '@/graphql/queries/exerciseNameReview.queries';

/** „Zrobione” dla jednego albo wielu wierszy; `name: null` to „Zostaw nazwę”. Stara nazwa idzie do aliasów. */
export const DECIDE_EXERCISE_NAMES_MUTATION = gql`
  mutation DecideExerciseNames($organizationId: String!, $decisions: [ExerciseNameDecisionInput!]!) {
    decideExerciseNames(organizationId: $organizationId, decisions: $decisions) {
      ...ExerciseNameReviewRowFragment
    }
  }
  ${EXERCISE_NAME_REVIEW_ROW_FRAGMENT}
`;

export const UNDO_EXERCISE_NAME_DECISION_MUTATION = gql`
  mutation UndoExerciseNameDecision($organizationId: String!, $exerciseId: String!) {
    undoExerciseNameDecision(organizationId: $organizationId, exerciseId: $exerciseId) {
      ...ExerciseNameReviewRowFragment
    }
  }
  ${EXERCISE_NAME_REVIEW_ROW_FRAGMENT}
`;

export const SAVE_EXERCISE_NAME_VOCABULARY_MUTATION = gql`
  mutation SaveExerciseNameVocabulary($terms: [ExerciseNameVocabularyTermInput!]!) {
    saveExerciseNameVocabulary(terms: $terms) {
      id
      preferred
      avoid
    }
  }
`;

export const GENERATE_EXERCISE_NAME_PROPOSALS_MUTATION = gql`
  mutation GenerateExerciseNameProposals($organizationId: String!, $regenerateTodo: Boolean!) {
    generateExerciseNameProposals(organizationId: $organizationId, regenerateTodo: $regenerateTodo) {
      organizationId
      state
      proposed
      total
      failed
      error
      startedAt
      finishedAt
    }
  }
`;
