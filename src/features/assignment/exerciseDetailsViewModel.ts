import { fromExerciseMapping } from '@/components/shared/exercise';
import { formatLoad } from '@/utils/loadParser';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseMapping } from './types';

const FALLBACK_DESCRIPTION = 'Brak opisu ćwiczenia.';

export interface ExerciseDetailsViewModel {
  id: string;
  displayName: string;
  description: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
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
  rangeOfMotion?: string;
  loadDisplayText?: string;
  notes?: string;
  side?: string;
  difficultyLevel?: string;
  mainTags: string[];
  additionalTags: string[];
  scope?: string;
  status?: string;
}

function pickPatientDescription(mapping: ExerciseMapping): string | undefined {
  const customDescription = mapping.customDescription?.trim();
  if (customDescription) return customDescription;

  const patientDescription = mapping.exercise?.patientDescription?.trim();
  if (patientDescription) return patientDescription;

  const legacyDescription = mapping.exercise?.description?.trim();
  if (legacyDescription) return legacyDescription;

  return undefined;
}

function pickClinicalDescription(mapping: ExerciseMapping): string | undefined {
  return mapping.exercise?.clinicalDescription?.trim() || undefined;
}

function pickAudioCue(mapping: ExerciseMapping): string | undefined {
  return mapping.exercise?.audioCue?.trim() || undefined;
}

function normalizeTags(tags?: string[]): string[] {
  return (tags || [])
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function pickLoadText(mapping: ExerciseMapping, fallbackLoadText?: string): string | undefined {
  if (fallbackLoadText?.trim()) return fallbackLoadText.trim();

  const loadText = mapping.loadText?.trim();
  if (loadText) return loadText;

  if (mapping.load) {
    const formattedLoad = formatLoad(mapping.load);
    if (formattedLoad) return formattedLoad;
  }

  if (mapping.exercise?.defaultLoad) {
    const formattedDefaultLoad = formatLoad(mapping.exercise.defaultLoad);
    if (formattedDefaultLoad) return formattedDefaultLoad;
  }

  const exerciseLoadText = mapping.exercise?.loadText?.trim();
  return exerciseLoadText || undefined;
}

function pickVideoUrl(mapping: ExerciseMapping): string | undefined {
  const mediaUrl = getMediaUrl(mapping.videoUrl ?? mapping.exercise?.videoUrl);
  return mediaUrl ?? undefined;
}

export function buildExerciseDetailsViewModel(mapping: ExerciseMapping): ExerciseDetailsViewModel {
  const cardData = fromExerciseMapping(mapping);
  const patientDescription = pickPatientDescription(mapping);
  const normalizedNotes = cardData.notes?.trim();
  const clinicalDescription = pickClinicalDescription(mapping);
  const audioCue = pickAudioCue(mapping);

  return {
    id: mapping.id,
    displayName: cardData.displayName,
    description: patientDescription ?? FALLBACK_DESCRIPTION,
    patientDescription,
    clinicalDescription,
    audioCue,
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
    rangeOfMotion: mapping.exercise?.rangeOfMotion?.trim() || undefined,
    loadDisplayText: pickLoadText(mapping, cardData.loadDisplayText),
    notes: normalizedNotes || undefined,
    side: cardData.side,
    difficultyLevel: mapping.exercise?.difficultyLevel || undefined,
    mainTags: normalizeTags(mapping.exercise?.mainTags),
    additionalTags: normalizeTags(mapping.exercise?.additionalTags),
    scope: mapping.exercise?.scope || undefined,
    status: mapping.exercise?.status || undefined,
  };
}

