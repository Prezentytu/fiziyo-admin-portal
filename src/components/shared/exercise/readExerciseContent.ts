/**
 * Wspólny czytnik treści ćwiczenia: jeden model odczytu dla rekordów starych (v2, v3) i v3.3 (FR-007).
 *
 * `schemaVersion` przełącza tylko to, skąd bierzemy opis dla pacjenta i pola, które v3.3 przeniosło
 * w nowe miejsce. Reszta (kroki, wskazówki z fazą, błędy, „Przerwij, gdy”) leży tam samo w obu wersjach.
 *
 * Planowani odbiorcy (podłączenie w następnym PR; do tego czasu nikt tej funkcji nie woła):
 * - `src/features/exercises/ExerciseDetailSections.tsx`
 * - `src/features/assignment/exerciseDetailsViewModel.ts`
 * - `src/features/patients/ExercisePreviewDrawer.tsx`
 * - `src/components/pdf/pdfExerciseUtils.ts`
 * - strona szczegółów zestawu
 * - etapy weryfikacji (`src/features/verification/stages/`)
 */
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import type { EnrichmentCuePhaseV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

export type ExerciseContentVersion = 'legacy' | '3.3';

/** Pola rekordu ćwiczenia, z których czytnik korzysta. Pasuje do `Exercise` i do ćwiczenia w mappingu. */
export interface ExerciseContentSource {
  /** Dokument treści. Backend zwraca obiekt; tekst JSON też przyjmujemy. */
  enrichmentData?: ExerciseEnrichmentData | string | null;
  /** Przyszła kolumna wersji; wygrywa z `enrichmentData.schemaVersion`. */
  schemaVersion?: string | number | null;
  patientDescription?: string | null;
  /** Starsza nazwa `patientDescription` w części odpowiedzi API. */
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  equipment?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
}

export interface ExerciseContentInstruction {
  summary: string | null;
  steps: string[];
  /** Stara kolumna opisu dla pacjenta. Tylko rekord stary; dla 3.3 zawsze `null`. */
  description: string | null;
}

export interface ExerciseContentCue {
  text: string;
  /** Faza, w której lektor czyta wskazówkę. Brak wpisu w `cue_phases` oznacza pracę. */
  phase: EnrichmentCuePhaseV3;
}

export interface ExerciseContentMistake {
  mistake: string;
  fix: string | null;
}

export interface ExerciseContentIndication {
  /** 3.3: kod ze słownika (`classification.indications`). */
  code: string | null;
  /** Rekord stary: tekst z `therapist.indications`. */
  text: string | null;
}

export interface ExerciseContentPrecaution {
  /** Kod grupy szczególnej; `null`, gdy wpis go nie podaje. */
  group: string | null;
  /** Jedno zdanie dla pacjenta, bez przeróbek. */
  text: string;
}

export interface ExerciseContentCheckpoint {
  text: string;
  evidence: string | null;
  view: string | null;
}

export interface ExerciseContentEquipmentItem {
  label: string;
  code: string | null;
  qty: number | null;
  /** `null`, gdy źródło tego nie mówi (rekord stary, kolumna tekstowa). */
  required: boolean | null;
  substitutes: string[];
}

export interface ExerciseContentBreathing {
  text: string;
  pattern: string | null;
}

export interface ExerciseContentSide {
  /** 3.3: `side.mode` (`none`, `each_side`, `alternating`, `left`, `right`). Rekord stary: wartość kolumny strony. */
  mode: string | null;
  /** Dawka liczona na stronę. 3.3 przy dwóch stronach: tak, chyba że dokument mówi wprost `false`. Rekord stary zawsze `false` (liczy łącznie). */
  perSideDose: boolean;
  start: string | null;
  shownInMedia: string | null;
}

export interface ExerciseContent {
  version: ExerciseContentVersion;
  /** Zapisany numer wersji bez zmian (np. `"3.3"`); `null` dla rekordu starego. */
  schemaVersion: string | null;
  instruction: ExerciseContentInstruction;
  /** Jest co pokazać pacjentowi jako instrukcję: opis (rekord stary), podsumowanie albo kroki. */
  hasInstruction: boolean;
  cues: ExerciseContentCue[];
  mistakes: ExerciseContentMistake[];
  why: string | null;
  whenToDo: string | null;
  shouldFeel: string | null;
  shouldNotFeel: string | null;
  easier: string | null;
  harder: string | null;
  breathing: ExerciseContentBreathing | null;
  /** Tekst „Przerwij, gdy”, jeden objaw w linii. Pokazywany bez przeróbek. */
  stopIf: string | null;
  /** Kod reguły bólu (np. `WS-3`). Tylko 3.3. */
  painRule: string | null;
  /** 3.3: `safety.contraindications`; rekord stary: `therapist.contraindications`. */
  contraindications: string[];
  /** Ostrożności dla grup szczególnych (`safety.precautions`), w zapisanej kolejności. Tylko 3.3; pacjent widzi je osobnym blokiem na końcu karty. */
  precautions: ExerciseContentPrecaution[];
  /** Kody flag bezpieczeństwa. Tylko 3.3. */
  safetyFlags: string[];
  requiresSupervision: boolean | null;
  indications: ExerciseContentIndication[];
  checkpoints: ExerciseContentCheckpoint[];
  /** 3.3: `therapist.note`; rekord stary: `therapist.clinical_notes`. Pacjent nigdy nie widzi. */
  therapistNote: string | null;
  /** 3.3: `equipment_items`; rekord stary: lista `equipment`. Gdy dokument milczy: kolumna sprzętu. */
  equipment: ExerciseContentEquipmentItem[];
  side: ExerciseContentSide;
  /** Stara kolumna opisu klinicznego. Tylko rekord stary. */
  clinicalDescription: string | null;
  /** Kolumna notatek. Tylko rekord stary: kontrakt v3.3 §2 ją wycofał (uwaga fizjoterapeuty należy do pozycji planu). */
  notes: string | null;
  /** Kolumna podpowiedzi głosowej. Tylko rekord stary: w v3.3 zastępują ją `patient.cues`. */
  audioCue: string | null;
}

const CUE_PHASES: readonly EnrichmentCuePhaseV3[] = ['preparation', 'work', 'rest'];
const FIRST_NEW_READER_VERSION = [3, 3] as const;
/** `side.mode` z kontraktu oraz wartość kolumny strony („obie”), gdy dokument nie ma sekcji `side`. */
const TWO_SIDED_MODES = ['each_side', 'alternating', 'both'];

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asTextList(value: unknown): string[] {
  return asList(value)
    .map(asText)
    .filter((text): text is string => text !== null);
}

function parseDocument(value: ExerciseContentSource['enrichmentData']): UnknownRecord | null {
  if (typeof value !== 'string') return asRecord(value);
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function readSchemaVersion(source: ExerciseContentSource, document: UnknownRecord | null): string | null {
  for (const candidate of [source.schemaVersion, document?.schemaVersion]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
    const text = asText(candidate);
    if (text) return text;
  }
  return null;
}

/** 3.3 i każda późniejsza wersja czyta się po nowemu: czytnik rośnie, nie wraca do starej kolumny. */
function isNewReaderVersion(schemaVersion: string | null): boolean {
  const match = schemaVersion?.match(/^(\d+)(?:\.(\d+))?/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  const [minMajor, minMinor] = FIRST_NEW_READER_VERSION;
  return major > minMajor || (major === minMajor && minor >= minMinor);
}

/** Rekord stary: v2 sprowadzamy do v3 istniejącym `toV3`; gdy dokument jest zbyt uszkodzony, czytamy go wprost. */
function toLegacyDocument(document: UnknownRecord | null): UnknownRecord {
  if (!document) return {};
  try {
    return (asRecord(toV3(document as ExerciseEnrichmentData)) ?? {}) as UnknownRecord;
  } catch {
    return document;
  }
}

function readCues(patient: UnknownRecord | null): ExerciseContentCue[] {
  const phaseByIndex = new Map<number, EnrichmentCuePhaseV3>();
  for (const link of asList(patient?.cue_phases)) {
    const entry = asRecord(link);
    const phase = CUE_PHASES.find((known) => known === entry?.phase);
    if (entry && typeof entry.cue === 'number' && phase) phaseByIndex.set(entry.cue, phase);
  }
  // Indeks z `cue_phases` wskazuje pozycję w zapisanej liście, więc puste wpisy odsiewamy dopiero po przypisaniu fazy.
  return asList(patient?.cues)
    .map((cue, index) => ({ text: asText(cue), phase: phaseByIndex.get(index) ?? ('work' as const) }))
    .filter((cue): cue is ExerciseContentCue => cue.text !== null);
}

function readMistakes(patient: UnknownRecord | null): ExerciseContentMistake[] {
  return asList(patient?.mistakes)
    .map((item) => {
      const entry = asRecord(item);
      return { mistake: asText(entry?.mistake), fix: asText(entry?.fix) };
    })
    .filter((item): item is ExerciseContentMistake => item.mistake !== null);
}

function readCheckpoints(therapist: UnknownRecord | null): ExerciseContentCheckpoint[] {
  return asList(therapist?.checkpoints)
    .map((item) => {
      const entry = asRecord(item);
      // Tolerujemy też sam tekst zamiast obiektu.
      return { text: asText(entry ? entry.text : item), evidence: asText(entry?.evidence), view: asText(entry?.view) };
    })
    .filter((item): item is ExerciseContentCheckpoint => item.text !== null);
}

function readEquipmentItems(document: UnknownRecord): ExerciseContentEquipmentItem[] {
  return asList(document.equipment_items)
    .map((item) => {
      const entry = asRecord(item);
      return {
        label: asText(entry?.label) ?? asText(entry?.code),
        code: asText(entry?.code),
        qty: typeof entry?.qty === 'number' && Number.isFinite(entry.qty) ? entry.qty : null,
        required: typeof entry?.required === 'boolean' ? entry.required : null,
        substitutes: asTextList(entry?.substitutes),
      };
    })
    .filter((item): item is ExerciseContentEquipmentItem => item.label !== null);
}

function textEquipment(labels: string[]): ExerciseContentEquipmentItem[] {
  return labels.map((label) => ({ label, code: null, qty: null, required: null, substitutes: [] }));
}

function readEquipment(
  isNew: boolean,
  document: UnknownRecord,
  source: ExerciseContentSource
): ExerciseContentEquipmentItem[] {
  const fromDocument = isNew ? readEquipmentItems(document) : textEquipment(asTextList(document.equipment));
  if (fromDocument.length > 0) return fromDocument;
  // Zapas, gdy dokument milczy (np. rekord podniesiony mechanicznie). Kontrakt §1 zakłada, że kolumnę liczy backend
  // z `equipment_items`; dziś backend tego nie robi, więc kolumna bywa starsza od dokumentu.
  const column = asText(source.equipment);
  return column ? textEquipment([column]) : [];
}

function readSide(isNew: boolean, document: UnknownRecord, source: ExerciseContentSource): ExerciseContentSide {
  const column = asText(source.side) ?? asText(source.exerciseSide);
  const side = isNew ? asRecord(document.side) : null;
  const mode = asText(side?.mode) ?? column;
  // Kontrakt §6.7: w 3.3 przy dwóch stronach `reps` jest zawsze na stronę; brak sekcji albo klucza znaczy to samo.
  const twoSided = isNew && TWO_SIDED_MODES.includes((mode ?? '').toLowerCase());
  return {
    mode,
    perSideDose: twoSided ? side?.per_side_dose !== false : side?.per_side_dose === true,
    start: asText(side?.start),
    shownInMedia: asText(side?.shown_in_media),
  };
}

function readBreathing(document: UnknownRecord): ExerciseContentBreathing | null {
  const breathing = asRecord(document.breathing);
  const text = asText(breathing?.text);
  return text ? { text, pattern: asText(breathing?.pattern) } : null;
}

function readContraindications(isNew: boolean, safety: UnknownRecord | null, therapist: UnknownRecord | null): string[] {
  if (!isNew) return asTextList(therapist?.contraindications);
  return asList(safety?.contraindications)
    .map((item) => asText(asRecord(item)?.text ?? item))
    .filter((text): text is string => text !== null);
}

function readPrecautions(isNew: boolean, safety: UnknownRecord | null): ExerciseContentPrecaution[] {
  if (!isNew) return [];
  return asList(safety?.precautions)
    .map((item) => {
      const entry = asRecord(item);
      return { group: asText(entry?.group), text: asText(entry?.text) };
    })
    .filter((item): item is ExerciseContentPrecaution => item.text !== null);
}

function readIndications(
  isNew: boolean,
  document: UnknownRecord,
  therapist: UnknownRecord | null
): ExerciseContentIndication[] {
  if (!isNew) return asTextList(therapist?.indications).map((text) => ({ code: null, text }));
  return asTextList(asRecord(document.classification)?.indications).map((code) => ({ code, text: null }));
}

/**
 * Czyta treść ćwiczenia do jednego modelu widoku. Nie zmienia wejścia i nie rzuca na uszkodzonym dokumencie.
 *
 * Rekord jest „3.3”, gdy mówi to kolumna `schemaVersion` albo `enrichmentData.schemaVersion`
 * (3.3 lub wyżej); w każdym innym razie jest stary. Dla 3.3 stare kolumny opisu
 * (`patientDescription`, `clinicalDescription`) są pomijane, nawet gdy zostały wypełnione.
 */
export function readExerciseContent(exercise: ExerciseContentSource | null | undefined): ExerciseContent {
  const source: ExerciseContentSource = exercise ?? {};
  const rawDocument = parseDocument(source.enrichmentData);
  const schemaVersion = readSchemaVersion(source, rawDocument);
  const isNew = isNewReaderVersion(schemaVersion);
  const document = isNew ? (rawDocument ?? {}) : toLegacyDocument(rawDocument);

  const patient = asRecord(document.patient);
  const therapist = asRecord(document.therapist);
  const safety = asRecord(document.safety);

  const instruction: ExerciseContentInstruction = {
    summary: asText(patient?.summary),
    steps: asTextList(patient?.steps),
    description: isNew ? null : (asText(source.patientDescription) ?? asText(source.description)),
  };

  return {
    version: isNew ? '3.3' : 'legacy',
    schemaVersion: isNew ? schemaVersion : null,
    instruction,
    hasInstruction:
      instruction.description !== null || instruction.summary !== null || instruction.steps.length > 0,
    cues: readCues(patient),
    mistakes: readMistakes(patient),
    why: asText(patient?.why),
    whenToDo: asText(patient?.when_to_do),
    shouldFeel: asText(patient?.should_feel),
    shouldNotFeel: asText(patient?.should_not_feel),
    easier: asText(patient?.easier),
    harder: asText(patient?.harder),
    breathing: readBreathing(document),
    stopIf: asText(safety?.stop_if),
    painRule: isNew ? asText(safety?.pain_rule) : null,
    contraindications: readContraindications(isNew, safety, therapist),
    precautions: readPrecautions(isNew, safety),
    safetyFlags: isNew
      ? asList(safety?.flags)
          .map((flag) => asText(asRecord(flag)?.code ?? flag))
          .filter((code): code is string => code !== null)
      : [],
    requiresSupervision: typeof safety?.requires_supervision === 'boolean' ? safety.requires_supervision : null,
    indications: readIndications(isNew, document, therapist),
    checkpoints: readCheckpoints(therapist),
    therapistNote: asText(isNew ? therapist?.note : therapist?.clinical_notes),
    equipment: readEquipment(isNew, document, source),
    side: readSide(isNew, document, source),
    clinicalDescription: isNew ? null : asText(source.clinicalDescription),
    notes: isNew ? null : asText(source.notes),
    audioCue: isNew ? null : asText(source.audioCue),
  };
}

export interface PrintableInstructionOptions {
  /** Numeruj kroki („1. …”). Domyślnie tak. */
  numbered?: boolean;
}

/**
 * Linie instrukcji do druku (PDF, podgląd). Opis ze starej kolumny wygrywa, bo tak PDF drukuje dziś;
 * gdy opisu nie ma (każdy rekord 3.3), drukujemy podsumowanie i kroki.
 */
export function printableInstructionLines(
  content: Pick<ExerciseContent, 'instruction'>,
  { numbered = true }: PrintableInstructionOptions = {}
): string[] {
  const { description, summary, steps } = content.instruction;
  if (description) {
    return description
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
  }
  return [...(summary ? [summary] : []), ...steps.map((step, index) => (numbered ? `${index + 1}. ${step}` : step))];
}
