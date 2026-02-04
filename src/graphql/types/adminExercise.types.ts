/**
 * Types for Admin Exercise Verification Module (Centrum Weryfikacji)
 * Used by ContentManager and SiteSuperAdmin roles
 */

// ============================================
// Enums
// ============================================

/**
 * Exercise content status in the verification workflow
 * Matches backend ContentStatus enum
 */
export type ContentStatus =
  | 'DRAFT'           // Robocze - widzi tylko twórca
  | 'PENDING_REVIEW'  // Zgłoszone do weryfikacji
  | 'CHANGES_REQUESTED' // Odrzucone z uwagami
  | 'APPROVED'        // Zatwierdzone
  | 'PUBLISHED'       // Publiczne
  | 'ARCHIVED_GLOBAL';  // Wycofane z bazy globalnej (soft delete)

/**
 * Predefiniowane powody odrzucenia ćwiczenia
 */
export type RejectionReason =
  | 'POOR_MEDIA_QUALITY'      // Zła jakość wideo/obrazu
  | 'CLINICAL_ERROR'          // Błąd merytoryczny w technice
  | 'INCOMPLETE_DESCRIPTION'  // Niekompletny opis
  | 'INCORRECT_TAGS'          // Nieodpowiednie tagi
  | 'POTENTIAL_DUPLICATE'     // Potencjalny duplikat
  | 'OTHER';                  // Inne

// ============================================
// Verification Stats (from GetVerificationStats)
// ============================================

export interface VerificationStats {
  pendingReview: number;
  changesRequested: number;
  approved: number;
  published: number;
  archivedGlobal: number; // ARCHIVED_GLOBAL count
  total: number;
}

// ============================================
// Admin Exercise (extended with verification fields)
// ============================================

export interface AdminExercise {
  id: string;
  name: string;
  description?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  type: string;
  side?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  defaultExecutionTime?: number;
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
  gifUrl?: string;
  videoUrl?: string;
  notes?: string;
  audioCue?: string;
  tempo?: string;
  mainTags?: string[];
  additionalTags?: string[];
  scope?: string;
  isActive: boolean;
  isSystem?: boolean;
  isPublicTemplate?: boolean;
  isSystemExample?: boolean;
  status: ContentStatus;
  adminReviewNotes?: string;
  contributorId?: string;
  createdById?: string;
  organizationId?: string;
  difficultyLevel?: string;
  progressionFamilyId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Extended training parameters
  rangeOfMotion?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  // Navigation properties
  createdBy?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  };
}

// ============================================
// Bulk Operation Result
// ============================================

export interface BulkOperationResult {
  totalRequested: number;
  successCount: number;
  failedIds: string[];
  errors: string[];
}

// ============================================
// Query Variables
// ============================================

export interface GetExercisesByStatusVariables {
  status: ContentStatus;
}

// ============================================
// Mutation Variables
// ============================================

export interface ApproveExerciseVariables {
  exerciseId: string;
  reviewNotes?: string | null;
}

export interface RejectExerciseVariables {
  exerciseId: string;
  rejectionReason: string;
  notes: string;
}

export interface UnpublishExerciseVariables {
  exerciseId: string;
  reason?: string | null;
}

export interface BatchApproveExercisesVariables {
  exerciseIds: string[];
}

// ============================================
// Query Responses
// ============================================

export interface GetPendingReviewExercisesResponse {
  pendingReviewExercises: AdminExercise[];
}

export interface GetChangesRequestedExercisesResponse {
  changesRequestedExercises: AdminExercise[];
}

export interface GetApprovedExercisesResponse {
  approvedExercises: AdminExercise[];
}

export interface GetPublishedExercisesResponse {
  exercisesByStatus: AdminExercise[];
}

export interface GetArchivedExercisesResponse {
  exercisesByStatus: AdminExercise[];
}

export interface GetVerificationStatsResponse {
  verificationStats: VerificationStats;
}

// ============================================
// Mutation Responses
// ============================================

export interface ApproveExerciseResponse {
  approveExercise: AdminExercise;
}

export interface RejectExerciseResponse {
  rejectExercise: AdminExercise;
}

export interface UnpublishExerciseResponse {
  unpublishExercise: AdminExercise;
}

export interface BatchApproveExercisesResponse {
  batchApproveExercises: {
    success: boolean;
    processedCount: number;
    totalRequested: number;
    errors: string[];
  };
}

export interface PublishApprovedExercisesResponse {
  publishApprovedExercises: {
    success: boolean;
    publishedCount: number;
    message?: string;
  };
}

// ============================================
// Reviewer Stats (Gamification)
// ============================================

export interface ReviewerStats {
  totalApproved: number;
  totalRejected: number;
  currentStreak: number;
  total: number;
}

export interface GetReviewerStatsResponse {
  reviewerStats: ReviewerStats;
}

// ============================================
// Tag Suggestions (AI)
// ============================================

export interface TagSuggestions {
  mainTags: string[];
  additionalTags: string[];
  suggestedCategory: string;
}

export interface GetSuggestedTagsVariables {
  exerciseId: string;
}

export interface GetSuggestedTagsResponse {
  suggestedTags: TagSuggestions;
}

// ============================================
// Exercise Relationships (Graph)
// ============================================

/**
 * Typ relacji między ćwiczeniami
 */
export type ExerciseRelationType = 'REGRESSION' | 'PROGRESSION' | 'ALTERNATIVE' | 'VARIATION';

/**
 * Poziom trudności ćwiczenia (dla walidacji relacji)
 */
export type DifficultyLevel = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

/**
 * Minimalna reprezentacja ćwiczenia dla relacji
 */
export interface ExerciseRelationTarget {
  id: string;
  name: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  difficultyLevel?: DifficultyLevel;
  mainTags?: string[];
  type?: string;
  /** Czy sugestia AI */
  isAISuggested?: boolean;
  /** Czy zweryfikowane */
  isVerified?: boolean;
}

/**
 * Pełna relacja między ćwiczeniami
 */
export interface ExerciseRelation {
  id: string;
  sourceExerciseId: string;
  targetExerciseId: string;
  relationType: ExerciseRelationType;
  targetExercise: ExerciseRelationTarget;
  confidence?: number; // 0-1, jak pewna jest sugestia AI
  isAISuggested?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  verifiedAt?: string;
  verifiedById?: string;
}

/**
 * Relacje ćwiczenia (regresja + progresja)
 */
export interface ExerciseRelationships {
  regression?: ExerciseRelation | null;
  progression?: ExerciseRelation | null;
  alternatives?: ExerciseRelation[];
  variations?: ExerciseRelation[];
}

/**
 * Kandydat do relacji (sugestia AI)
 */
export interface RelationCandidate {
  exercise: ExerciseRelationTarget;
  confidence: number;
  reason?: string; // np. "Podobne tagi", "Podobna nazwa", "Embeddings similarity"
}

// ============================================
// Relationship Mutations Variables
// ============================================

export interface SetExerciseRelationVariables {
  sourceExerciseId: string;
  targetExerciseId: string;
  relationType: ExerciseRelationType;
}

export interface RemoveExerciseRelationVariables {
  sourceExerciseId: string;
  relationType: ExerciseRelationType;
}

export interface GetRelationCandidatesVariables {
  exerciseId: string;
  relationType: ExerciseRelationType;
  limit?: number;
}

// ============================================
// Relationship Query/Mutation Responses
// ============================================

export interface GetExerciseRelationshipsResponse {
  exerciseRelationships: ExerciseRelationships;
}

export interface RelationCandidatesResult {
  exerciseId: string;
  relationType: string;
  candidates: Array<{
    id: string;
    name: string;
    thumbnailUrl?: string;
    gifUrl?: string;
    difficultyLevel?: DifficultyLevel;
    isSameFamily?: boolean;
    mainTags?: string[];
  }>;
}

export interface GetRelationCandidatesResponse {
  relationCandidates: RelationCandidatesResult;
}

export interface SearchExercisesForRelationResponse {
  searchExercisesForRelation: ExerciseRelationTarget[];
}

export interface SetExerciseRelationResponse {
  setExerciseRelation: ExerciseRelation;
}

export interface RemoveExerciseRelationResponse {
  removeExerciseRelation: boolean;
}