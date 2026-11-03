import { formatExerciseSideLabel } from '@/utils/exerciseSideLabels';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { parseStopIf, type VerificationStageKey } from './verificationStages';

export interface ChangeSnapshot {
  name: string;
  patientDescription: string;
  therapistDescription: string;
  sets: number | null;
  reps: number | null;
  executionTime: number | null;
  restSets: number | null;
  side: string;
  videoUrl: string;
  imageCount: number;
  enrichment: ExerciseEnrichmentData;
}

interface ChangeSnapshotSource {
  name: string;
  patientDescription: string;
  clinicalDescription: string;
  sets: number | null;
  reps: number | null;
  executionTime: number | null;
  restSets: number | null;
  side: string;
  videoUrl: string;
}

export function toChangeSnapshot(
  core: ChangeSnapshotSource,
  imageCount: number,
  enrichment: ExerciseEnrichmentData
): ChangeSnapshot {
  return {
    name: core.name,
    patientDescription: core.patientDescription,
    therapistDescription: core.clinicalDescription,
    sets: core.sets,
    reps: core.reps,
    executionTime: core.executionTime,
    restSets: core.restSets,
    side: core.side,
    videoUrl: core.videoUrl,
    imageCount,
    enrichment,
  };
}

type ChangeStage = Exclude<VerificationStageKey, 'decision'>;

const NUMBER_LABELS: Array<{ key: 'sets' | 'reps' | 'executionTime' | 'restSets'; label: string; unit: string }> = [
  { key: 'sets', label: 'serie', unit: '' },
  { key: 'reps', label: 'powtórzenia', unit: '' },
  { key: 'executionTime', label: 'czas', unit: ' s' },
  { key: 'restSets', label: 'przerwa', unit: ' s' },
];

function formatNumber(value: number | null, unit: string): string {
  return value == null ? 'puste' : `${value}${unit}`;
}

function countChange(label: string, before: number, after: number): string | null {
  return before === after ? null : `${label}: ${before} → ${after}`;
}

function filledCount(values: string[] | undefined): number {
  return (values ?? []).filter((value) => value.trim().length > 0).length;
}

export function summarizeChanges(
  initial: ChangeSnapshot,
  current: ChangeSnapshot,
  replacedPhotoCount: number
): Record<ChangeStage, string[]> {
  const material: string[] = [];
  if (!initial.videoUrl && current.videoUrl) material.push('dodane nagranie');
  else if (initial.videoUrl !== current.videoUrl) material.push('wymienione nagranie');
  if (replacedPhotoCount > 0) material.push(`wymienione zdjęcia: ${replacedPhotoCount}`);
  if (current.imageCount > initial.imageCount)
    material.push(`dodane zdjęcia: ${current.imageCount - initial.imageCount}`);
  if (current.imageCount < initial.imageCount)
    material.push(`usunięte zdjęcia: ${initial.imageCount - current.imageCount}`);

  const parameters = NUMBER_LABELS.filter(({ key }) => initial[key] !== current[key]).map(
    ({ key, label, unit }) => `${label} ${formatNumber(initial[key], unit)} → ${formatNumber(current[key], unit)}`
  );
  if (initial.side !== current.side)
    parameters.push(`strona: ${formatExerciseSideLabel(initial.side)} → ${formatExerciseSideLabel(current.side)}`);

  const initialPatient = initial.enrichment.patient;
  const currentPatient = current.enrichment.patient;
  const instruction = [
    initial.name.trim() !== current.name.trim() ? 'nowa nazwa' : null,
    initial.patientDescription.trim() !== current.patientDescription.trim() ? 'poprawiony opis' : null,
    countChange('kroki', filledCount(initialPatient?.steps), filledCount(currentPatient?.steps)),
    countChange('wskazówki', filledCount(initialPatient?.cues), filledCount(currentPatient?.cues)),
    countChange('typowe błędy', initialPatient?.mistakes?.length ?? 0, currentPatient?.mistakes?.length ?? 0),
  ].filter((entry): entry is string => entry !== null);

  const safety = [
    countChange(
      'objawy przerwania',
      parseStopIf(initial.enrichment.safety?.stop_if).length,
      parseStopIf(current.enrichment.safety?.stop_if).length
    ),
    initial.therapistDescription.trim() !== current.therapistDescription.trim()
      ? 'poprawiony opis dla fizjoterapeuty'
      : null,
    Boolean(initial.enrichment.safety?.requires_supervision) !==
    Boolean(current.enrichment.safety?.requires_supervision)
      ? current.enrichment.safety?.requires_supervision
        ? 'tylko pod nadzorem'
        : 'bez wymogu nadzoru'
      : null,
  ].filter((entry): entry is string => entry !== null);

  return { material, parameters, instruction, safety };
}
