/**
 * Typy dla ćwiczeń i mutacji GraphQL
 */

// ============================================
// Enums
// ============================================

export type ExerciseType = 'reps' | 'time';
export type ExerciseSide = 'none' | 'left' | 'right' | 'both' | 'alternating';
export type ExerciseScope = 'PERSONAL' | 'ORGANIZATION' | 'GLOBAL';

// ============================================
// Exercise Model
// ============================================

export interface Exercise {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  videoUrl?: string;
  gifUrl?: string;
  imageUrl?: string;
  images?: string[];
  notes?: string;
  isActive?: boolean;
  scope?: ExerciseScope;
  isPublicTemplate?: boolean;
  exerciseSide?: ExerciseSide | string;
  mainTags?: string[];
  additionalTags?: string[];
  createdById?: string;
  ownerId?: string;
  creationTime?: string;
}

// ============================================
// Create Exercise Mutation
// ============================================

export interface CreateExerciseVariables {
  organizationId: string;
  scope: ExerciseScope;
  name: string;
  description: string;
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
  description?: string | null;
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





