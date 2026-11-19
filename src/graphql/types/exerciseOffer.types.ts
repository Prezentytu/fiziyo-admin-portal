import type { ExerciseEnrichmentData } from './exerciseEnrichment.types';

export type ExerciseOfferMode = 'ADOPT' | 'REVIEW' | 'TRANSFER';

export type ExerciseOfferStatus = 'PENDING' | 'ACCEPTED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'WITHDRAWN';

export type ExerciseOfferDecision = 'ACCEPT' | 'REQUEST_CHANGES' | 'REJECT';

/** Ćwiczenie w propozycji: pola karty i wszystko, czego potrzebuje podgląd (`ExercisePreviewDialog`). */
export interface ExerciseOfferExercise {
  id: string;
  name: string;
  type?: string | null;
  side?: string | null;
  patientDescription?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  mainTags?: string[] | null;
  additionalTags?: string[] | null;
  images?: string[] | null;
  videoUrl?: string | null;
  preparationTime?: number | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultExecutionTime?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
  enrichmentData?: ExerciseEnrichmentData | null;
}

export interface ExerciseOffer {
  id: string;
  mode: string;
  status: string;
  message?: string | null;
  offeredAt: string;
  respondedAt?: string | null;
  responseNote?: string | null;
  adoptedExerciseId?: string | null;
  exercise?: ExerciseOfferExercise | null;
}

export interface GetExerciseOffersResponse {
  exerciseOffers: ExerciseOffer[];
}

export interface GetExerciseOffersVariables {
  organizationId: string;
  status?: ExerciseOfferStatus | null;
}

export interface RespondToExerciseOfferResponse {
  respondToExerciseOffer: ExerciseOffer;
}

export interface RespondToExerciseOfferVariables {
  organizationId: string;
  offerId: string;
  decision: ExerciseOfferDecision;
  note?: string | null;
}
