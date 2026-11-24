import { fromBuilderExercise } from '@/components/shared/exercise/adapters';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise/types';
import { getExerciseVideos } from '@/utils/exerciseVideos';
import type {
  ExerciseOffer,
  ExerciseOfferDecision,
  ExerciseOfferExercise,
  ExerciseOfferMode,
} from '@/graphql/types/exerciseOffer.types';

export interface OfferView {
  id: string;
  mode: ExerciseOfferMode;
  exerciseId: string | null;
  exerciseName: string;
  description: string | null;
  imageUrl: string | null;
  hasVideo: boolean;
  message: string | null;
  offeredAt: string;
  /** Ćwiczenie tak, jak zobaczy je gabinet po przyjęciu; null, gdy backend nie pokazuje treści. */
  preview: ExerciseExecutionCardData | null;
}

/**
 * Whether accepting puts the exercise into the clinic library: ADOPT makes a copy, TRANSFER moves the same record
 * (owner changes; Demo flag, media and relations stay). For the clinic both read as „Dodaj do gabinetu”.
 */
export function landsInLibrary(mode: ExerciseOfferMode): boolean {
  return mode === 'ADOPT' || mode === 'TRANSFER';
}

function toMode(mode: string): ExerciseOfferMode {
  return mode === 'ADOPT' || mode === 'TRANSFER' ? mode : 'REVIEW';
}

/** Open offers only, newest first; unknown mode falls back to review so nothing lands in the library by accident. */
export function toPendingOfferViews(offers: ReadonlyArray<ExerciseOffer> | null | undefined): OfferView[] {
  return (offers ?? [])
    .filter((offer) => offer.status === 'PENDING')
    .map((offer) => ({
      id: offer.id,
      mode: toMode(offer.mode),
      exerciseId: offer.exercise?.id ?? null,
      exerciseName: offer.exercise?.name?.trim() || 'Ćwiczenie bez nazwy',
      description: offer.exercise?.patientDescription?.trim() || offer.exercise?.clinicalDescription?.trim() || null,
      imageUrl: offer.exercise?.images?.find((url) => Boolean(url?.trim())) ?? null,
      hasVideo: getExerciseVideos(offer.exercise).length > 0,
      message: offer.message?.trim() || null,
      offeredAt: offer.offeredAt,
      preview: toOfferPreview(offer.exercise),
    }))
    .sort((left, right) => right.offeredAt.localeCompare(left.offeredAt));
}

/**
 * Podgląd proponowanego ćwiczenia z jego własnymi parametrami (bez nadpisań gabinetu, bo jeszcze ich nie ma),
 * ten sam co przy wyborze ćwiczenia do zestawu.
 */
export function toOfferPreview(exercise: ExerciseOfferExercise | null | undefined): ExerciseExecutionCardData | null {
  if (!exercise) {
    return null;
  }
  return fromBuilderExercise(
    {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type ?? undefined,
      side: exercise.side ?? undefined,
      patientDescription: exercise.patientDescription ?? undefined,
      clinicalDescription: exercise.clinicalDescription ?? undefined,
      audioCue: exercise.audioCue ?? undefined,
      rangeOfMotion: exercise.rangeOfMotion ?? undefined,
      resistance: exercise.resistance,
      equipment: exercise.equipment,
      difficultyLevel: exercise.difficultyLevel ?? undefined,
      mainTags: exercise.mainTags ?? undefined,
      additionalTags: exercise.additionalTags ?? undefined,
      images: exercise.images,
      videoUrl: exercise.videoUrl ?? undefined,
      videos: exercise.videos,
      preparationTime: exercise.preparationTime ?? undefined,
      defaultSets: exercise.defaultSets ?? undefined,
      defaultReps: exercise.defaultReps ?? undefined,
      defaultDuration: exercise.defaultDuration ?? undefined,
      defaultExecutionTime: exercise.defaultExecutionTime ?? undefined,
      defaultRestBetweenSets: exercise.defaultRestBetweenSets ?? undefined,
      defaultRestBetweenReps: exercise.defaultRestBetweenReps ?? undefined,
      enrichmentData: exercise.enrichmentData,
    },
    { tempo: exercise.tempo ?? undefined }
  );
}

export function countAdoptable(offers: ReadonlyArray<OfferView>): number {
  return offers.filter((offer) => landsInLibrary(offer.mode)).length;
}

export interface DecisionCopy {
  title: string;
  confirmLabel: string;
  noteLabel: string;
  noteRequired: boolean;
}

export function decisionCopy(decision: ExerciseOfferDecision, mode: ExerciseOfferMode): DecisionCopy {
  switch (decision) {
    case 'REQUEST_CHANGES':
      return {
        title: 'Odeślij do poprawki',
        confirmLabel: 'Odeślij',
        noteLabel: 'Co poprawić',
        noteRequired: true,
      };
    case 'REJECT':
      return {
        title: landsInLibrary(mode) ? 'Odrzuć propozycję' : 'Odrzuć ćwiczenie',
        confirmLabel: 'Odrzuć',
        noteLabel: 'Powód',
        noteRequired: false,
      };
    case 'ACCEPT':
    default:
      return {
        title: landsInLibrary(mode) ? 'Dodaj do gabinetu' : 'Zatwierdź bez uwag',
        confirmLabel: landsInLibrary(mode) ? 'Dodaj' : 'Zatwierdź',
        noteLabel: 'Uwaga',
        noteRequired: false,
      };
  }
}

/** Returns the trimmed note to send, or an error message when the decision needs one. */
export function validateDecisionNote(
  decision: ExerciseOfferDecision,
  note: string
): { ok: true; note: string | null } | { ok: false; error: string } {
  const trimmed = note.trim();
  if (decision === 'REQUEST_CHANGES' && trimmed.length === 0) {
    return { ok: false, error: 'Napisz, co poprawić.' };
  }
  return { ok: true, note: trimmed.length > 0 ? trimmed : null };
}

export interface BatchAcceptResult {
  accepted: number;
  failed: number;
}

/** Accepts offers one by one so a single failure does not stop the rest. */
export async function runBatchAccept(
  offerIds: ReadonlyArray<string>,
  accept: (offerId: string) => Promise<void>
): Promise<BatchAcceptResult> {
  let accepted = 0;
  let failed = 0;
  for (const offerId of offerIds) {
    try {
      await accept(offerId);
      accepted += 1;
    } catch {
      failed += 1;
    }
  }
  return { accepted, failed };
}

export function exercisesLabel(count: number): string {
  if (count === 1) return '1 ćwiczenie';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${count} ${few ? 'ćwiczenia' : 'ćwiczeń'}`;
}
