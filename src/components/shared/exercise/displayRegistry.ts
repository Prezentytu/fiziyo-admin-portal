import { formatDurationPolish } from '@/utils/durationPolish';

export type ExerciseFieldGroup = 'dosage' | 'execution' | 'content' | 'classification';

export type ExerciseFieldIconKey =
  | 'sets'
  | 'reps'
  | 'time'
  | 'pause'
  | 'tempo'
  | 'load'
  | 'side'
  | 'range'
  | 'difficulty'
  | 'description'
  | 'audio'
  | 'notes';

export type ExerciseFieldKey =
  | 'sets'
  | 'reps'
  | 'duration'
  | 'executionTime'
  | 'restSets'
  | 'restReps'
  | 'preparationTime'
  | 'tempo'
  | 'load'
  | 'side'
  | 'rangeOfMotion'
  | 'difficultyLevel'
  | 'patientDescription'
  | 'clinicalDescription'
  | 'audioCue'
  | 'notes';

export interface ExerciseFieldMetadata {
  key: ExerciseFieldKey;
  label: string;
  tooltip: string;
  iconKey?: ExerciseFieldIconKey;
  group: ExerciseFieldGroup;
  isInlineVisible: boolean;
  isDialogVisible: boolean;
  formatValue: (source: ExerciseFieldValueSource) => string | null;
}

export interface ExerciseFieldValueSource {
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadDisplayText?: string;
  side?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  notes?: string;
}

export const HIDE_EXERCISE_TAGS = true;
export const EMPTY_NUMERIC_VALUE = '—';
export const EMPTY_TEXT_VALUE = 'Nie ustawiono';

const DIFFICULTY_LABELS: Record<string, string> = {
  UNKNOWN: 'Nieokreślony',
  BEGINNER: 'Początkujący',
  EASY: 'Łatwy',
  MEDIUM: 'Średni',
  HARD: 'Trudny',
  EXPERT: 'Ekspert',
};

const SIDE_LABELS: Record<string, string> = {
  left: 'Lewa strona',
  right: 'Prawa strona',
  both: 'Obie strony',
  alternating: 'Naprzemiennie',
  none: 'Bez podziału',
};

const asPositiveSeconds = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return `${value}s`;
};

const asReadableDuration = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return formatDurationPolish(value);
};

const asPositiveNumber = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return String(value);
};

const asTrimmedText = (value?: string): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export function formatSideLabel(side?: string): string | null {
  if (!side) return null;
  return SIDE_LABELS[side.toLowerCase()] ?? null;
}

export function formatDifficultyLabel(difficulty?: string): string | null {
  if (!difficulty) return null;
  const normalizedDifficulty = difficulty.trim();
  if (!normalizedDifficulty) return null;
  return DIFFICULTY_LABELS[normalizedDifficulty.toUpperCase()] ?? normalizedDifficulty;
}

export function formatFieldValueWithPlaceholder(
  metadata: ExerciseFieldMetadata,
  source: ExerciseFieldValueSource,
  emptyValue: string = EMPTY_NUMERIC_VALUE
): string {
  return metadata.formatValue(source) ?? emptyValue;
}

export const EXERCISE_FIELD_METADATA: Record<ExerciseFieldKey, ExerciseFieldMetadata> = {
  sets: {
    key: 'sets',
    label: 'Serie',
    tooltip: 'Ile pełnych serii pacjent ma wykonać w jednej sesji tego ćwiczenia.',
    iconKey: 'sets',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveNumber(viewModel.sets),
  },
  reps: {
    key: 'reps',
    label: 'Powtórzenia',
    tooltip: 'Ile powtórzeń pacjent wykonuje w każdej serii.',
    iconKey: 'reps',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveNumber(viewModel.reps),
  },
  duration: {
    key: 'duration',
    label: 'Czas serii',
    tooltip:
      'Łączny czas jednej serii w sekundach. Pole techniczne dla ćwiczeń liczonych czasem zamiast powtórzeń.',
    iconKey: 'time',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asReadableDuration(viewModel.duration),
  },
  executionTime: {
    key: 'executionTime',
    label: 'Czas powtórzenia',
    tooltip: 'Czas pojedynczego powtórzenia. To główny parametr timera; wartość > 0 uruchamia timer w aplikacji pacjenta.',
    iconKey: 'time',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.executionTime),
  },
  restSets: {
    key: 'restSets',
    label: 'Przerwa między seriami',
    tooltip: 'Przerwa po zakończeniu serii, zanim pacjent rozpocznie następną serię.',
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.restSets),
  },
  restReps: {
    key: 'restReps',
    label: 'Przerwa między powt.',
    tooltip: 'Krótka mikro-przerwa między pojedynczymi powtórzeniami.',
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.restReps),
  },
  preparationTime: {
    key: 'preparationTime',
    label: 'Czas przygotowania',
    tooltip: 'Czas na ustawienie pozycji i przygotowanie pacjenta przed startem ruchu.',
    iconKey: 'time',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.preparationTime),
  },
  tempo: {
    key: 'tempo',
    label: 'Tempo',
    tooltip: 'Tempo ruchu, np. 3-1-2-0. Pomaga utrzymać właściwą kontrolę i jakość wykonania.',
    iconKey: 'tempo',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.tempo),
  },
  load: {
    key: 'load',
    label: 'Obciążenie',
    tooltip: 'Docelowe obciążenie lub opór, z jakim pacjent ma wykonać ćwiczenie.',
    iconKey: 'load',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.loadDisplayText),
  },
  side: {
    key: 'side',
    label: 'Strona ciała',
    tooltip: 'Określa stronę ciała: lewa, prawa, obie lub naprzemiennie.',
    iconKey: 'side',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatSideLabel(viewModel.side),
  },
  rangeOfMotion: {
    key: 'rangeOfMotion',
    label: 'Zakres ruchu (ROM)',
    tooltip: 'Docelowy zakres ruchu (ROM), który pacjent powinien osiągnąć.',
    iconKey: 'range',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.rangeOfMotion),
  },
  difficultyLevel: {
    key: 'difficultyLevel',
    label: 'Poziom trudności',
    tooltip: 'Poziom trudności pomocny przy doborze progresji i regresji ćwiczenia.',
    iconKey: 'difficulty',
    group: 'classification',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatDifficultyLabel(viewModel.difficultyLevel),
  },
  patientDescription: {
    key: 'patientDescription',
    label: 'Opis dla pacjenta',
    tooltip: 'Instrukcja dla pacjenta prostym językiem: co ma zrobić krok po kroku.',
    iconKey: 'description',
    group: 'content',
    isInlineVisible: false,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.patientDescription),
  },
  clinicalDescription: {
    key: 'clinicalDescription',
    label: 'Opis kliniczny',
    tooltip: 'Opis kliniczny dla fizjoterapeuty: cel, biomechanika, uwagi terapeutyczne.',
    iconKey: 'description',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.clinicalDescription),
  },
  audioCue: {
    key: 'audioCue',
    label: 'Polecenia audio',
    tooltip: 'Krótka komenda głosowa, którą pacjent słyszy podczas wykonywania ćwiczenia.',
    iconKey: 'audio',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.audioCue),
  },
  notes: {
    key: 'notes',
    label: 'Notatki',
    tooltip: 'Dodatkowe notatki terapeuty: na co szczególnie zwrócić uwagę przy wykonaniu.',
    iconKey: 'notes',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.notes),
  },
};

export const INLINE_EXERCISE_FIELD_ORDER: ExerciseFieldKey[] = [
  'executionTime',
  'tempo',
  'side',
  'rangeOfMotion',
  'preparationTime',
  'restSets',
  'restReps',
  'load',
  'difficultyLevel',
  'clinicalDescription',
  'audioCue',
  'notes',
];

export const DIALOG_EXERCISE_FIELD_ORDER: ExerciseFieldKey[] = [
  'sets',
  'reps',
  'executionTime',
  'duration',
  'restSets',
  'restReps',
  'preparationTime',
  'tempo',
  'load',
  'side',
  'rangeOfMotion',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
  'notes',
];
