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
  | 'PUBLISHED';      // Publiczne

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
// Exercise Status Stats
// ============================================

export interface ExerciseStatusStats {
  draft: number;
  pendingReview: number;
  changesRequested: number;
  approved: number;
  published: number;
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
  notes?: string | null;
}

export interface RejectExerciseVariables {
  exerciseId: string;
  notes: string;
}

export interface BulkApproveExercisesVariables {
  exerciseIds: string[];
}

export interface BulkRejectExercisesVariables {
  exerciseIds: string[];
  notes: string;
}

export interface ResubmitForReviewVariables {
  exerciseId: string;
}

// ============================================
// Query Responses
// ============================================

export interface GetPendingExercisesResponse {
  pendingExercises: AdminExercise[];
}

export interface GetExercisesByStatusResponse {
  exercisesByStatus: AdminExercise[];
}

export interface GetExerciseStatusStatsResponse {
  exerciseStatusStats: ExerciseStatusStats;
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

export interface BulkApproveExercisesResponse {
  bulkApproveExercises: BulkOperationResult;
}

export interface BulkRejectExercisesResponse {
  bulkRejectExercises: BulkOperationResult;
}

export interface ResubmitForReviewResponse {
  resubmitForReview: AdminExercise;
}
