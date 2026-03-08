export type ExerciseFieldGroup = 'dosage' | 'execution' | 'content' | 'classification';

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

const asPositiveSeconds = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return `${value}s`;
};

const asPositiveNumber = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return String(value);
};

const asTrimmedText = (value?: string): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const SIDE_LABELS: Record<string, string> = {
  left: 'Lewa strona',
  right: 'Prawa strona',
  both: 'Obie strony',
  alternating: 'Naprzemiennie',
  none: 'Bez podziału',
};

function formatSideLabel(side?: string): string | null {
  if (!side) return null;
  return SIDE_LABELS[side.toLowerCase()] ?? null;
}

export const EXERCISE_FIELD_METADATA: Record<ExerciseFieldKey, ExerciseFieldMetadata> = {
  sets: {
    key: 'sets',
    label: 'Serie',
    tooltip: 'Liczba serii w jednym wykonaniu ćwiczenia.',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveNumber(viewModel.sets),
  },
  reps: {
    key: 'reps',
    label: 'Powtórzenia',
    tooltip: 'Liczba powtórzeń wykonywanych w każdej serii.',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveNumber(viewModel.reps),
  },
  duration: {
    key: 'duration',
    label: 'Czas serii',
    tooltip: 'Łączny czas wykonywania jednej serii (w sekundach).',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.duration),
  },
  executionTime: {
    key: 'executionTime',
    label: 'Czas powtórzenia',
    tooltip: 'Czas jednego powtórzenia. Wartość > 0 uruchamia timer dla pacjenta.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.executionTime),
  },
  restSets: {
    key: 'restSets',
    label: 'Przerwa między seriami',
    tooltip: 'Czas odpoczynku po zakończeniu serii, przed kolejną serią.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.restSets),
  },
  restReps: {
    key: 'restReps',
    label: 'Przerwa między powt.',
    tooltip: 'Mikro-przerwa pomiędzy pojedynczymi powtórzeniami.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.restReps),
  },
  preparationTime: {
    key: 'preparationTime',
    label: 'Czas przygotowania',
    tooltip: 'Czas przygotowania pacjenta przed rozpoczęciem ćwiczenia.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asPositiveSeconds(viewModel.preparationTime),
  },
  tempo: {
    key: 'tempo',
    label: 'Tempo',
    tooltip: 'Zapis tempa ruchu, np. 3-1-2-0 (ekscentryka-pauza-koncentryka-pauza).',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.tempo),
  },
  load: {
    key: 'load',
    label: 'Obciążenie',
    tooltip: 'Docelowe obciążenie/opór podczas wykonywania ćwiczenia.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.loadDisplayText),
  },
  side: {
    key: 'side',
    label: 'Strona ciała',
    tooltip: 'Wskazuje stronę wykonywania ćwiczenia: lewa, prawa, obie lub naprzemiennie.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatSideLabel(viewModel.side),
  },
  rangeOfMotion: {
    key: 'rangeOfMotion',
    label: 'Zakres ruchu (ROM)',
    tooltip: 'Docelowy zakres ruchu, który pacjent ma wykonać w ćwiczeniu.',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.rangeOfMotion),
  },
  difficultyLevel: {
    key: 'difficultyLevel',
    label: 'Poziom trudności',
    tooltip: 'Poziom złożoności ćwiczenia pomocny przy doborze progresji.',
    group: 'classification',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.difficultyLevel),
  },
  patientDescription: {
    key: 'patientDescription',
    label: 'Opis dla pacjenta',
    tooltip: 'Instrukcja dla pacjenta napisana prostym, zrozumiałym językiem.',
    group: 'content',
    isInlineVisible: false,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.patientDescription),
  },
  clinicalDescription: {
    key: 'clinicalDescription',
    label: 'Opis kliniczny',
    tooltip: 'Opis medyczny przeznaczony dla fizjoterapeuty.',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.clinicalDescription),
  },
  audioCue: {
    key: 'audioCue',
    label: 'Polecenia Audio',
    tooltip: 'Krótka komenda głosowa, którą pacjent może usłyszeć podczas ćwiczenia.',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.audioCue),
  },
  notes: {
    key: 'notes',
    label: 'Notatki',
    tooltip: 'Dodatkowe uwagi terapeuty dotyczące wykonania ćwiczenia.',
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
  'duration',
  'executionTime',
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
