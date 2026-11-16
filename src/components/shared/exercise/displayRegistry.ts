import { formatDurationPolish } from '@/utils/durationPolish';
import { EXERCISE_SIDE_HELP } from '@/utils/exerciseSideLabels';
import { EXERCISE_CONTENT_LABELS, EXERCISE_NOTES_HINT } from '@/components/shared/enrichment/enrichmentFieldLabels';

export type ExerciseFieldGroup = 'dosage' | 'execution' | 'content' | 'classification';

export type ExerciseFieldIconKey =
  | 'sets'
  | 'reps'
  | 'time'
  | 'pause'
  | 'tempo'
  | 'load'
  | 'resistance'
  | 'equipment'
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
  | 'resistance'
  | 'equipment'
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
  /** Rekord w kontrakcie 3.3 (`isV33ExerciseRecord`): „naprzemiennie” to liczba na każdą stronę. */
  alternatingPerSide?: boolean;
  sets?: number;
  reps?: number;
  /** Zakres powtórzeń z recepty rekordu 3.3; kafelek pokazuje „min–max” zamiast wartości domyślnej. */
  repsRange?: { min: number; max: number };
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadDisplayText?: string;
  resistance?: string;
  equipment?: string;
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
  /** Legacy alias — prefer UNKNOWN in new writes (fieldContract / GraphQL). */
  BEGINNER: 'Nieokreślony',
  EASY: 'Łatwy',
  MEDIUM: 'Średni',
  HARD: 'Trudny',
  EXPERT: 'Ekspert',
};

const SIDE_LABELS: Record<string, string> = {
  left: 'Tylko lewa',
  right: 'Tylko prawa',
  both: 'Na każdą stronę',
  alternating: 'Naprzemiennie',
  none: 'Razem',
};

/**
 * Liczby parametrów (KONTRAKT-v3.3: brak klucza albo `null` = brak wartości, `0` to wartość).
 * Brak wartości pokazujemy jako placeholder („—”), zero jako zero: tak samo jak pole w edycji, które dla `null`
 * jest puste, a dla `0` pokazuje „0”.
 */
const asSeconds = (value?: number | null): string | null => (value == null ? null : formatParameterSeconds(value));

const asReadableDuration = (value?: number): string | null => {
  if (value == null || value <= 0) return null;
  return formatDurationPolish(value);
};

const asNumber = (value?: number | null): string | null => (value == null ? null : String(value));

const asTrimmedText = (value?: string): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

/** Sekundy parametru tak, jak w polu edycji (liczba i jednostka „s”): „30 s”, „0 s”. */
export function formatParameterSeconds(value: number): string {
  return `${value} s`;
}

export function formatSideLabel(side?: string, alternatingPerSide = false): string | null {
  if (!side) return null;
  const normalized = side.toLowerCase();
  if (normalized === 'alternating' && alternatingPerSide) return `${SIDE_LABELS.alternating}, na każdą stronę`;
  return SIDE_LABELS[normalized] ?? null;
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

/** Wartości parametrów tak, jak trzyma je formularz edycji: `null` znaczy brak wartości, `0` jest wartością. */
export type ExerciseParameterValueInput = {
  [Key in Exclude<keyof ExerciseFieldValueSource, 'repsRange' | 'alternatingPerSide'>]?:
    | ExerciseFieldValueSource[Key]
    | null;
} & { loadKg?: number | null };

/**
 * Jedno formatowanie parametru dla podglądu ćwiczenia i formularza edycji (wartości odziedziczone):
 * ta sama etykieta strony, trudności, sekundy z jednostką, „—” tylko dla braku wartości.
 */
export function formatParameterValue(
  key: ExerciseFieldKey,
  values: ExerciseParameterValueInput,
  { alternatingPerSide = false, emptyValue = EMPTY_NUMERIC_VALUE }: { alternatingPerSide?: boolean; emptyValue?: string } = {}
): string {
  const source: ExerciseFieldValueSource = { alternatingPerSide };
  for (const [field, value] of Object.entries(values)) {
    if (value != null && field !== 'loadKg') (source as Record<string, unknown>)[field] = value;
  }
  if (values.loadKg != null) source.loadDisplayText = `${values.loadKg} kg`;
  return formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA[key], source, emptyValue);
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
    formatValue: (viewModel) => asNumber(viewModel.sets),
  },
  reps: {
    key: 'reps',
    label: 'Powtórzenia',
    tooltip: 'Ile powtórzeń pacjent wykonuje w każdej serii.',
    iconKey: 'reps',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) =>
      viewModel.repsRange ? `${viewModel.repsRange.min}–${viewModel.repsRange.max}` : asNumber(viewModel.reps),
  },
  duration: {
    key: 'duration',
    label: 'Czas serii',
    tooltip:
      'Legacy: ręczny override czasu jednej serii. Preferuj „Czas powtórzenia” — czas serii jest wyliczany.',
    iconKey: 'time',
    group: 'dosage',
    /** Hidden from inline tiles — computed series time is shown instead (SPEC-023). */
    isInlineVisible: false,
    isDialogVisible: false,
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
    formatValue: (viewModel) => asSeconds(viewModel.executionTime),
  },
  restSets: {
    key: 'restSets',
    label: 'Przerwa między seriami',
    tooltip: 'Przerwa po zakończeniu serii, zanim pacjent rozpocznie następną serię.',
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.restSets),
  },
  restReps: {
    key: 'restReps',
    label: 'Przerwa między powt.',
    tooltip: 'Krótka mikro-przerwa między pojedynczymi powtórzeniami.',
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.restReps),
  },
  preparationTime: {
    key: 'preparationTime',
    label: 'Czas przygotowania',
    tooltip: 'Czas na ustawienie pozycji i przygotowanie pacjenta przed startem ruchu.',
    iconKey: 'time',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.preparationTime),
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
  resistance: {
    key: 'resistance',
    label: 'Opór',
    tooltip:
      'Opór, z jakim pacjent wykonuje ćwiczenie, np. siła gumy (lekki, średni, mocny) albo jej kolor. Pacjent widzi go w aplikacji obok obciążenia.',
    iconKey: 'resistance',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.resistance),
  },
  equipment: {
    key: 'equipment',
    label: 'Sprzęt',
    tooltip:
      'Sprzęt potrzebny do ćwiczenia, np. guma, hantel, piłka, step albo krzesło. Pacjent widzi go w aplikacji i może przygotować przed startem.',
    iconKey: 'equipment',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.equipment),
  },
  side: {
    key: 'side',
    label: 'Strona ciała',
    tooltip: EXERCISE_SIDE_HELP,
    iconKey: 'side',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatSideLabel(viewModel.side, viewModel.alternatingPerSide),
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
    label: EXERCISE_CONTENT_LABELS.clinicalDescription,
    tooltip: 'Opis dla fizjoterapeuty: cel, biomechanika, uwagi terapeutyczne. Pacjent go nie widzi.',
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
    label: EXERCISE_CONTENT_LABELS.notes,
    tooltip: `Na co szczególnie zwrócić uwagę przy wykonaniu. ${EXERCISE_NOTES_HINT}`,
    iconKey: 'notes',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.notes),
  },
};

/** Kanoniczna kolejność parametrów dawki (te same pola i kolejność w widoku, edycji i kreatorze). */
export const CANONICAL_PARAMETER_ORDER: readonly ExerciseFieldKey[] = [
  'sets',
  'reps',
  'executionTime',
  'tempo',
  'restSets',
  'restReps',
  'preparationTime',
  'load',
  'resistance',
  'equipment',
  'side',
  'rangeOfMotion',
  'difficultyLevel',
];

export const INLINE_EXERCISE_FIELD_ORDER: ExerciseFieldKey[] = [
  'executionTime',
  'tempo',
  'restSets',
  'restReps',
  'preparationTime',
  'load',
  'resistance',
  'equipment',
  'side',
  'rangeOfMotion',
  'difficultyLevel',
  'clinicalDescription',
  'audioCue',
  'notes',
];

export const DIALOG_EXERCISE_FIELD_ORDER: ExerciseFieldKey[] = [
  ...CANONICAL_PARAMETER_ORDER,
  'patientDescription',
  'clinicalDescription',
  'audioCue',
  'notes',
];
