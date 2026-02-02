// Eksport wszystkich typów GraphQL
export * from "./user.types";
export * from "./clinic.types";
export * from "./exercise.types";
// Re-export adminExercise types excluding duplicates (ContentStatus, DifficultyLevel are in exercise.types)
export type {
  AdminExercise,
  ExerciseRelationType,
  ExerciseRelationTarget,
  ExerciseRelation,
  ExerciseRelationships,
  RelationCandidate,
  GetExerciseRelationshipsResponse,
  GetRelationCandidatesResponse,
  SearchExercisesForRelationResponse,
  SetExerciseRelationResponse,
  RemoveExerciseRelationResponse,
  VerificationStats,
  BulkOperationResult,
  ReviewerStats,
  TagSuggestions,
} from "./adminExercise.types";