export type ExerciseOfferMode = 'ADOPT' | 'REVIEW' | 'TRANSFER';

export type ExerciseOfferStatus = 'PENDING' | 'ACCEPTED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'WITHDRAWN';

export type ExerciseOfferDecision = 'ACCEPT' | 'REQUEST_CHANGES' | 'REJECT';

export interface ExerciseOfferExercise {
  id: string;
  name: string;
  patientDescription?: string | null;
  clinicalDescription?: string | null;
  images?: string[] | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultExecutionTime?: number | null;
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
