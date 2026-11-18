import { formatDurationPolish } from '@/utils/durationPolish';
import { getExerciseSideHelp } from '@/utils/exerciseSideLabels';
import { fieldHelpToText, type FieldHelp } from '@/utils/fieldHelp';
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
  | 'restAfterExercise'
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
  /** Structured help behind the "i" icon. */
  help: FieldHelp;
  /** Plain-text form of `help` (for `title` attributes). */
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
  /** Odpoczynek po ćwiczeniu (s); brak = auto (przerwa między seriami, potem między powtórzeniami). */
  restAfterExercise?: number | null;
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

const FIELD_METADATA_WITHOUT_TOOLTIP: Record<ExerciseFieldKey, Omit<ExerciseFieldMetadata, 'tooltip'>> = {
  sets: {
    key: 'sets',
    label: 'Serie',
    help: { summary: 'Ile serii pacjent wykonuje w jednej sesji.', example: '3 serie po 10 powtórzeń.' },
    iconKey: 'sets',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asNumber(viewModel.sets),
  },
  reps: {
    key: 'reps',
    label: 'Powtórzenia',
    help: {
      summary: 'Ile powtórzeń pacjent robi w jednej serii.',
      example: '10 powtórzeń, potem przerwa między seriami.',
    },
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
    help: {
      summary: 'Starsze dane: ręcznie ustawiony czas jednej serii.',
      points: [{ term: 'Zamiast tego', text: 'ustaw „Czas powtórzenia”, a czas serii policzy się sam.' }],
    },
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
    help: {
      summary: 'Ile sekund trwa jedno powtórzenie.',
      points: [
        { term: 'Wpisane sekundy', text: 'aplikacja pacjenta odlicza czas każdego powtórzenia.' },
        { term: 'Puste pole', text: 'pacjent ćwiczy we własnym tempie, bez odliczania.' },
      ],
      example: 'utrzymanie pozycji przez 30 s – wpisz 30.',
    },
    iconKey: 'time',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.executionTime),
  },
  restSets: {
    key: 'restSets',
    label: 'Przerwa między seriami',
    help: { summary: 'Odpoczynek po skończonej serii, przed następną.', example: '60 s między seriami.' },
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.restSets),
  },
  restReps: {
    key: 'restReps',
    label: 'Przerwa między powt.',
    help: { summary: 'Krótka przerwa między powtórzeniami w jednej serii.', example: '2 s na powrót do pozycji wyjściowej.' },
    iconKey: 'pause',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.restReps),
  },
  preparationTime: {
    key: 'preparationTime',
    label: 'Czas przygotowania',
    help: {
      summary: 'Czas na zajęcie pozycji wyjściowej, zanim zacznie się ruch.',
      example: '10 s na położenie się na macie.',
    },
    iconKey: 'time',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asSeconds(viewModel.preparationTime),
  },
  restAfterExercise: {
    key: 'restAfterExercise',
    label: 'Odpoczynek po ćwiczeniu',
    help: {
      summary: 'Odpoczynek przed następnym ćwiczeniem w zestawie.',
      points: [
        { term: 'Puste pole', text: 'tyle co przerwa między seriami, a gdy jej nie ma – między powtórzeniami.' },
        { term: '0', text: 'bez odpoczynku, od razu następne ćwiczenie.' },
      ],
    },
    iconKey: 'pause',
    group: 'execution',
    /** Tylko pozycja zestawu i plan pacjenta (nie katalog); edycja w „Zaawansowanych parametrach”. */
    isInlineVisible: false,
    isDialogVisible: false,
    formatValue: (viewModel) => asSeconds(viewModel.restAfterExercise),
  },
  tempo: {
    key: 'tempo',
    label: 'Tempo',
    help: {
      summary: 'Rytm jednego powtórzenia: sekundy w kolejnych fazach ruchu.',
      example: '3-1-2-0 – 3 s opuszczanie, 1 s zatrzymanie, 2 s unoszenie, bez pauzy.',
    },
    iconKey: 'tempo',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.tempo),
  },
  load: {
    key: 'load',
    label: 'Obciążenie',
    help: { summary: 'Ciężar, z jakim pacjent wykonuje ćwiczenie.', example: 'hantel 2 kg.' },
    iconKey: 'load',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.loadDisplayText),
  },
  resistance: {
    key: 'resistance',
    label: 'Opór',
    help: {
      summary: 'Opór gumy lub urządzenia: siła albo kolor gumy.',
      points: [{ term: 'U pacjenta', text: 'widoczny w aplikacji obok obciążenia.' }],
      example: 'średni (czerwona guma).',
    },
    iconKey: 'resistance',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.resistance),
  },
  equipment: {
    key: 'equipment',
    label: 'Sprzęt',
    help: {
      summary: 'Sprzęt potrzebny do ćwiczenia.',
      points: [{ term: 'U pacjenta', text: 'widoczny przed startem, żeby zdążył go przygotować.' }],
      example: 'guma, krzesło, piłka.',
    },
    iconKey: 'equipment',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.equipment),
  },
  side: {
    key: 'side',
    label: 'Strona ciała',
    help: getExerciseSideHelp(),
    iconKey: 'side',
    group: 'dosage',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatSideLabel(viewModel.side, viewModel.alternatingPerSide),
  },
  rangeOfMotion: {
    key: 'rangeOfMotion',
    label: 'Zakres ruchu (ROM)',
    help: { summary: 'Docelowy zakres ruchu (ROM), do którego pacjent ma dojść.', example: '0–90° zgięcia w kolanie.' },
    iconKey: 'range',
    group: 'execution',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.rangeOfMotion),
  },
  difficultyLevel: {
    key: 'difficultyLevel',
    label: 'Poziom trudności',
    help: {
      summary: 'Poziom trudności ćwiczenia.',
      points: [{ term: 'Do czego', text: 'pomaga dobrać progresję i regresję.' }],
    },
    iconKey: 'difficulty',
    group: 'classification',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => formatDifficultyLabel(viewModel.difficultyLevel),
  },
  patientDescription: {
    key: 'patientDescription',
    label: 'Opis dla pacjenta',
    help: {
      summary: 'Instrukcja dla pacjenta: co ma zrobić, krok po kroku.',
      points: [{ term: 'Język', text: 'prosty, bez terminów fachowych.' }],
    },
    iconKey: 'description',
    group: 'content',
    isInlineVisible: false,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.patientDescription),
  },
  clinicalDescription: {
    key: 'clinicalDescription',
    label: EXERCISE_CONTENT_LABELS.clinicalDescription,
    help: {
      summary: 'Opis dla fizjoterapeuty: cel, biomechanika, uwagi.',
      points: [{ term: 'Widoczność', text: 'pacjent go nie widzi.' }],
    },
    iconKey: 'description',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.clinicalDescription),
  },
  audioCue: {
    key: 'audioCue',
    label: 'Polecenia audio',
    help: { summary: 'Krótka komenda głosowa, którą pacjent słyszy w trakcie ćwiczenia.', example: 'wdech przy wznosie.' },
    iconKey: 'audio',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.audioCue),
  },
  notes: {
    key: 'notes',
    label: EXERCISE_CONTENT_LABELS.notes,
    help: {
      summary: 'Na co szczególnie zwrócić uwagę przy wykonaniu.',
      points: [{ term: 'Widoczność', text: EXERCISE_NOTES_HINT }],
    },
    iconKey: 'notes',
    group: 'content',
    isInlineVisible: true,
    isDialogVisible: true,
    formatValue: (viewModel) => asTrimmedText(viewModel.notes),
  },
};

export const EXERCISE_FIELD_METADATA = Object.fromEntries(
  Object.entries(FIELD_METADATA_WITHOUT_TOOLTIP).map(([key, metadata]) => [
    key,
    { ...metadata, tooltip: fieldHelpToText(metadata.help) },
  ])
) as Record<ExerciseFieldKey, ExerciseFieldMetadata>;

/** Kanoniczna kolejność parametrów dawki (te same pola i kolejność w widoku, edycji i kreatorze). */
export const CANONICAL_PARAMETER_ORDER: readonly ExerciseFieldKey[] = [
  'sets',
  'reps',
  'executionTime',
  'side',
  'preparationTime',
  'tempo',
  'restReps',
  'restSets',
  'load',
  'equipment',
  'resistance',
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
