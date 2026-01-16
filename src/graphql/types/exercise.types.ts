/**
 * Typy dla ćwiczeń i mutacji GraphQL
 */

// ============================================
// Enums
// ============================================

export type ExerciseType = 'REPS' | 'TIME';
export type ExerciseSide = 'NONE' | 'LEFT' | 'RIGHT' | 'BOTH' | 'ALTERNATING';
export type ExerciseScope = 'PERSONAL' | 'ORGANIZATION' | 'GLOBAL';
export type ContentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED';
export type MediaType = 'VIDEO' | 'IMAGE' | 'AUDIO';
export type MediaContext = 'MAIN_DEMO' | 'THUMBNAIL' | 'COMMON_MISTAKE' | 'STEP_BY_STEP' | 'ANATOMY_VIEW' | 'PATIENT_MATERIAL';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

// ============================================
// ExerciseMedia Model
// ============================================

export interface ExerciseMedia {
  id: string;
  exerciseId: string;
  url: string;
  type: MediaType;
  context: MediaContext;
  order: number;
  caption?: string;
  createdAt?: string;
}

// ============================================
// Exercise Model
// ============================================

export interface Exercise {
  id: string;
  organizationId?: string;
  name: string;
  // Opisy
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  notes?: string;
  // Parametry wykonania
  type: ExerciseType | string;
  side?: ExerciseSide | string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  tempo?: string;
  // Media (legacy + nowe)
  videoUrl?: string;
  gifUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  images?: string[];
  media?: ExerciseMedia[];
  // Status i widoczność
  isActive?: boolean;
  scope?: ExerciseScope;
  status?: ContentStatus;
  isPublicTemplate?: boolean;
  isSystem?: boolean;
  isSystemExample?: boolean;
  adminReviewNotes?: string;
  // Tagi
  mainTags?: string[];
  additionalTags?: string[];
  // Progresja
  progressionFamilyId?: string;
  difficultyLevel?: DifficultyLevel;
  // Metadane
  createdById?: string;
  contributorId?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Legacy aliasy (dla kompatybilności wstecznej w komponentach)
  description?: string; // alias dla patientDescription
  exerciseSide?: ExerciseSide | string; // alias dla side
  executionTime?: number; // alias dla defaultExecutionTime
  sets?: number; // alias dla defaultSets
  reps?: number; // alias dla defaultReps
  duration?: number; // alias dla defaultDuration
  restSets?: number; // alias dla defaultRestBetweenSets
  restReps?: number; // alias dla defaultRestBetweenReps
  creationTime?: string; // alias dla createdAt
  isGlobal?: boolean; // deprecated - używać scope === 'GLOBAL'
  ownerId?: string; // deprecated - używać contributorId
}

// ============================================
// Create Exercise Mutation
// ============================================

export interface CreateExerciseVariables {
  organizationId: string;
  scope: ExerciseScope;
  name: string;
  description: string; // mapuje na patientDescription w backendzie
  type: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  executionTime?: number | null;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  images?: string[] | null;
  notes?: string | null;
  exerciseSetId?: string | null;
  isActive?: boolean | null;
  exerciseSide?: string | null;
  mainTags?: string[] | null;
  additionalTags?: string[] | null;
}

export interface CreateExerciseMutationResult {
  createExercise: Exercise;
}

// ============================================
// Update Exercise Mutation
// ============================================

export interface UpdateExerciseVariables {
  exerciseId: string;
  description?: string | null; // mapuje na patientDescription w backendzie
  type?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  executionTime?: number | null;
  videoUrl?: string | null;
  images?: string[] | null;
  notes?: string | null;
  mainTags?: string[] | null;
  additionalTags?: string[] | null;
  exerciseSide?: string | null;
}

export interface UpdateExerciseMutationResult {
  updateExercise: Exercise;
}

// ============================================
// Delete Exercise Mutation
// ============================================

export interface DeleteExerciseVariables {
  exerciseId: string;
}

export interface DeleteExerciseMutationResult {
  deleteExercise: boolean;
}

// ============================================
// Upload Image Mutation
// ============================================

export interface UploadExerciseImageVariables {
  exerciseId: string;
  base64Image: string;
  contentType?: string;
}

export interface UploadExerciseImageMutationResult {
  uploadExerciseImage: string;
}





