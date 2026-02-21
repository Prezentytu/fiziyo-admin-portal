import { fromExerciseMapping } from '@/components/shared/exercise';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseMapping } from './types';

const FALLBACK_DESCRIPTION = 'Brak opisu ćwiczenia.';

export interface ExerciseDetailsViewModel {
  id: string;
  displayName: string;
  description: string;
  imageUrls: string[];
  videoUrl?: string;
  sets: number;
  reps: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadDisplayText?: string;
  notes?: string;
  side?: string;
}

function pickDescription(mapping: ExerciseMapping): string {
  const customDescription = mapping.customDescription?.trim();
  if (customDescription) return customDescription;

  const patientDescription = mapping.exercise?.patientDescription?.trim();
  if (patientDescription) return patientDescription;

  const legacyDescription = mapping.exercise?.description?.trim();
  if (legacyDescription) return legacyDescription;

  return FALLBACK_DESCRIPTION;
}

function pickVideoUrl(mapping: ExerciseMapping): string | undefined {
  const mediaUrl = getMediaUrl(mapping.videoUrl ?? mapping.exercise?.videoUrl);
  return mediaUrl ?? undefined;
}

export function buildExerciseDetailsViewModel(mapping: ExerciseMapping): ExerciseDetailsViewModel {
  const cardData = fromExerciseMapping(mapping);
  const normalizedNotes = cardData.notes?.trim();

  return {
    id: mapping.id,
    displayName: cardData.displayName,
    description: pickDescription(mapping),
    imageUrls: cardData.imageUrls ?? [],
    videoUrl: pickVideoUrl(mapping),
    sets: cardData.sets,
    reps: cardData.reps,
    duration: cardData.duration,
    executionTime: cardData.executionTime,
    restSets: cardData.restSets,
    restReps: cardData.restReps,
    preparationTime: cardData.preparationTime,
    tempo: cardData.tempo,
    loadDisplayText: cardData.loadDisplayText,
    notes: normalizedNotes || undefined,
    side: cardData.side,
  };
}

