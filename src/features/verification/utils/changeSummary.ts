import { formatExerciseSideLabel } from '@/utils/exerciseSideLabels';
import { isMistakeRowEmpty } from '@/components/shared/enrichment/canRemovePlaceholderRow';
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { readContraindicationTextsV33 } from './contentV33';
import { countStopIfSymptoms, type VerificationStageKey } from './verificationStages';

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
  /** `'3.3'`: changes are described in contract places and the retired description columns are ignored. */
  contentVersion?: 'legacy' | '3.3';
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
  enrichment: ExerciseEnrichmentData,
  contentVersion: 'legacy' | '3.3' = 'legacy'
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
    contentVersion,
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

export function countFilledTexts(values: string[] | undefined): number {
  return (values ?? []).filter((value) => value.trim().length > 0).length;
}

export function countFilledMistakes(items: EnrichmentPatientMistakeV3[] | undefined): number {
  return (items ?? []).filter((item) => !isMistakeRowEmpty(item)).length;
}

function filledTexts(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

/** A list changed: by count when the count moved, otherwise by content. */
function listChange(label: string, editedLabel: string, before: unknown[], after: unknown[]): string | null {
  if (before.length !== after.length) return `${label}: ${before.length} → ${after.length}`;
  return JSON.stringify(before) === JSON.stringify(after) ? null : editedLabel;
}

function textChange(label: string, before: string | undefined, after: string | undefined): string | null {
  return (before ?? '').trim() === (after ?? '').trim() ? null : label;
}

function filledMistakes(items: EnrichmentPatientMistakeV3[] | undefined): Array<[string, string]> {
  return (items ?? [])
    .filter((item) => !isMistakeRowEmpty(item))
    .map((item) => [(item.mistake ?? '').trim(), (item.fix ?? '').trim()]);
}

function supervisionChange(initial: ChangeSnapshot, current: ChangeSnapshot): string | null {
  const before = Boolean(initial.enrichment.safety?.requires_supervision);
  const after = Boolean(current.enrichment.safety?.requires_supervision);
  if (before === after) return null;
  return after ? 'tylko pod nadzorem' : 'bez wymogu nadzoru';
}

function summarizeContentChangesV33(
  initial: ChangeSnapshot,
  current: ChangeSnapshot
): Pick<Record<ChangeStage, string[]>, 'instruction' | 'safety'> {
  const before = initial.enrichment.patient;
  const after = current.enrichment.patient;
  const beforeStopIf = initial.enrichment.safety?.stop_if;
  const afterStopIf = current.enrichment.safety?.stop_if;

  const instruction = [
    initial.name.trim() !== current.name.trim() ? 'nowa nazwa' : null,
    textChange('poprawione podsumowanie', before?.summary, after?.summary),
    listChange('kroki', 'poprawione kroki', filledTexts(before?.steps), filledTexts(after?.steps)),
    listChange('wskazówki', 'poprawione wskazówki', filledTexts(before?.cues), filledTexts(after?.cues)),
    JSON.stringify(before?.cue_phases ?? []) !== JSON.stringify(after?.cue_phases ?? [])
      ? 'zmienione fazy wskazówek'
      : null,
    listChange(
      'typowe błędy',
      'poprawione typowe błędy',
      filledMistakes(before?.mistakes),
      filledMistakes(after?.mistakes)
    ),
    textChange('poprawione „co czuć”', before?.should_feel, after?.should_feel) ??
      textChange('poprawione „co czuć”', before?.should_not_feel, after?.should_not_feel),
    textChange('poprawione „dlaczego”', before?.why, after?.why),
    textChange('poprawione „kiedy”', before?.when_to_do, after?.when_to_do),
  ].filter((entry): entry is string => entry !== null);

  const safety = [
    countChange('objawy przerwania', countStopIfSymptoms(beforeStopIf), countStopIfSymptoms(afterStopIf)) ??
      textChange('poprawione objawy przerwania', beforeStopIf, afterStopIf),
    listChange(
      'przeciwwskazania',
      'poprawione przeciwwskazania',
      readContraindicationTextsV33(initial.enrichment),
      readContraindicationTextsV33(current.enrichment)
    ),
    supervisionChange(initial, current),
  ].filter((entry): entry is string => entry !== null);

  return { instruction, safety };
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

  if (current.contentVersion === '3.3') {
    return { material, parameters, ...summarizeContentChangesV33(initial, current) };
  }

  const initialPatient = initial.enrichment.patient;
  const currentPatient = current.enrichment.patient;
  const instruction = [
    initial.name.trim() !== current.name.trim() ? 'nowa nazwa' : null,
    initial.patientDescription.trim() !== current.patientDescription.trim() ? 'poprawiony opis' : null,
    countChange('kroki', countFilledTexts(initialPatient?.steps), countFilledTexts(currentPatient?.steps)),
    countChange('wskazówki', countFilledTexts(initialPatient?.cues), countFilledTexts(currentPatient?.cues)),
    countChange(
      'typowe błędy',
      countFilledMistakes(initialPatient?.mistakes),
      countFilledMistakes(currentPatient?.mistakes)
    ),
  ].filter((entry): entry is string => entry !== null);

  const safety = [
    countChange(
      'objawy przerwania',
      countStopIfSymptoms(initial.enrichment.safety?.stop_if),
      countStopIfSymptoms(current.enrichment.safety?.stop_if)
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
