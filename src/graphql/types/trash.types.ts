/** Kosz zestawów i ćwiczeń (fizjo-app feat/kosz-zestawow-cwiczen). Backend czyta organizację z tokenu. */
export interface TrashedExerciseSet {
  id: string;
  name: string;
  kind: 'TEMPLATE' | 'PATIENT_PLAN';
  exerciseCount: number;
  deletedAt: string;
  purgeAt: string;
  deletedByName: string | null;
}

export interface TrashedExercise {
  id: string;
  name: string;
  imageUrl: string | null;
  deletedAt: string;
  purgeAt: string;
  deletedByName: string | null;
}

export interface GetTrashedExerciseSetsResponse {
  trashedExerciseSets: TrashedExerciseSet[];
}

export interface GetTrashedExercisesResponse {
  trashedExercises: TrashedExercise[];
}

export interface RestoreExerciseSetResponse {
  restoreExerciseSet: boolean;
}

export interface PurgeExerciseSetResponse {
  purgeExerciseSet: boolean;
}

export interface RestoreExerciseResponse {
  restoreExercise: boolean;
}

export interface PurgeExerciseResponse {
  purgeExercise: boolean;
}
