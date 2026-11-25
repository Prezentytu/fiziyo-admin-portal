import type { ContentStatus, OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

/** BW-FZ-123: przegląd nazw i ćwiczeń filarowych (tylko zespół FiziYo). Typy pisane ręcznie jak reszta panelu. */

export type ExerciseNameReviewStatus = 'TODO' | 'DONE';
export type ExerciseNameReviewAction = 'RENAMED' | 'KEPT_NAME' | 'UNDONE';
export type ExerciseNameProposalJobState = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ExerciseNameReviewOrganization {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface ExerciseNameProposal {
  proposedName: string | null;
  proposedIsPillar: boolean;
  proposedPillarExerciseId: string | null;
  family: string | null;
  reason: string | null;
  proposedAt: string | null;
  status: ExerciseNameReviewStatus;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  finalName: string | null;
  addedAlias: string | null;
}

export interface ExerciseNameReviewRow {
  exerciseId: string;
  name: string;
  aliases: string[];
  isPillar: boolean;
  pillarExerciseId: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  status: ContentStatus;
  organizationVerificationStatus: OrganizationVerificationStatus;
  proposal: ExerciseNameProposal | null;
}

export interface ExerciseNameReviewLogEntry {
  id: string;
  exerciseId: string;
  userId: string;
  userName: string | null;
  action: ExerciseNameReviewAction;
  oldName: string;
  newName: string;
  oldIsPillar: boolean;
  newIsPillar: boolean;
  oldPillarExerciseId: string | null;
  newPillarExerciseId: string | null;
  createdAt: string;
  canUndo: boolean;
}

export interface ExerciseNameVocabularyTerm {
  id: string;
  preferred: string;
  avoid: string[];
}

export interface ExerciseNameProposalJobStatus {
  organizationId: string;
  state: ExerciseNameProposalJobState;
  proposed: number;
  total: number;
  failed: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExerciseNameDecisionInput {
  exerciseId: string;
  /** null = „Zostaw nazwę”. */
  name: string | null;
  isPillar: boolean;
  pillarExerciseId: string | null;
}

export interface GetExerciseNameReviewOrganizationsResponse {
  exerciseNameReviewOrganizations: ExerciseNameReviewOrganization[];
}

export interface GetExerciseNameReviewsResponse {
  exerciseNameReviews: ExerciseNameReviewRow[];
}

export interface GetExerciseNameReviewLogResponse {
  exerciseNameReviewLog: ExerciseNameReviewLogEntry[];
}

export interface GetExerciseNameVocabularyResponse {
  exerciseNameVocabulary: ExerciseNameVocabularyTerm[];
}

export interface GetExerciseNameProposalJobResponse {
  exerciseNameProposalJob: { job: ExerciseNameProposalJobStatus; withoutProposal: number };
}

export interface DecideExerciseNamesResponse {
  decideExerciseNames: ExerciseNameReviewRow[];
}

export interface UndoExerciseNameDecisionResponse {
  undoExerciseNameDecision: ExerciseNameReviewRow;
}

export interface SaveExerciseNameVocabularyResponse {
  saveExerciseNameVocabulary: ExerciseNameVocabularyTerm[];
}

export interface GenerateExerciseNameProposalsResponse {
  generateExerciseNameProposals: ExerciseNameProposalJobStatus;
}
