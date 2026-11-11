/**
 * Zapis treści ćwiczenia w kontrakcie v3.3 (SPEC-038).
 *
 * Dokument do wysłania powstaje z dokumentu WCZYTANEGO, na który nakładamy tylko pola zmienione przez
 * fizjoterapeutę. Zmienić da się wyłącznie ścieżki z `V33_EDITABLE_PATHS`; wszystko inne (sekcje zespołu,
 * klucze spoza kontraktu, puste wartości, `schemaVersion`, `$schema`) wraca do bazy bez zmian.
 */
import { readExerciseContent } from '@/components/shared/exercise/readExerciseContent';
import { parseEnrichmentJson } from '@/features/verification/utils/enrichment';
import { ENRICHMENT_SCHEMA_V3, toV3 } from '@/features/verification/utils/enrichmentToV3';
import { realignMediaForBlankEntries } from '@/features/verification/utils/stepMedia';
import type { ExerciseEnrichmentData, ExerciseEnrichmentPatientV3 } from '@/graphql/types/exerciseEnrichment.types';

import { deepMergeFillGaps } from './enrichmentFillGaps';

export const THERAPIST_NOTE_MAX_LENGTH = 600;

const TEXT_PATHS = [
  'patient.summary',
  'patient.why',
  'patient.when_to_do',
  'patient.should_feel',
  'patient.should_not_feel',
  'patient.easier',
  'patient.harder',
  'breathing.text',
  'safety.stop_if',
  'therapist.note',
] as const;

const SUPERVISION_PATH = 'safety.requires_supervision';
const STEPS_PATH = 'patient.steps';
const STEP_IMAGES_PATH = 'patient.step_images';
const CUES_PATH = 'patient.cues';
const CUE_PHASES_PATH = 'patient.cue_phases';
const MISTAKES_PATH = 'patient.mistakes';
const CONTRAINDICATIONS_PATH = 'safety.contraindications';
const CHECKPOINTS_PATH = 'therapist.checkpoints';
const EQUIPMENT_ITEMS_PATH = 'equipment_items';

/** Jedyne ścieżki dokumentu 3.3, które zapis z formularza może zmienić. */
export const V33_EDITABLE_PATHS: readonly string[] = [
  ...TEXT_PATHS,
  SUPERVISION_PATH,
  STEPS_PATH,
  STEP_IMAGES_PATH,
  CUES_PATH,
  CUE_PHASES_PATH,
  MISTAKES_PATH,
  CONTRAINDICATIONS_PATH,
  CHECKPOINTS_PATH,
  EQUIPMENT_ITEMS_PATH,
];

/** Ścieżka → nowa wartość. `undefined` znaczy: fizjoterapeuta opróżnił pole, klucz znika z dokumentu. */
export type V33Edits = Record<string, unknown>;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function trimmedText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function getAtPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split('.')) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
}

function setAtPath(target: UnknownRecord, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = target;
  for (const key of keys.slice(0, -1)) {
    const nested = asRecord(current[key]);
    if (nested) {
      current = nested;
    } else {
      const created: UnknownRecord = {};
      current[key] = created;
      current = created;
    }
  }
  current[keys[keys.length - 1]] = value;
}

/** Removes the leaf only; a parent left empty stays, because the therapist did not touch it. */
function deleteAtPath(target: UnknownRecord, path: string): void {
  const keys = path.split('.');
  let current: UnknownRecord | null = target;
  for (const key of keys.slice(0, -1)) {
    current = asRecord(current?.[key]);
    if (!current) return;
  }
  delete current[keys[keys.length - 1]];
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Dokument 3.3 do edycji: kopia tego, co przyszło z bazy, bez normalizacji i bez przycinania. */
export function loadV33Document(raw: ExerciseEnrichmentData | string | null | undefined): ExerciseEnrichmentData {
  if (typeof raw === 'string') {
    try {
      return (asRecord(JSON.parse(raw)) ?? {}) as ExerciseEnrichmentData;
    } catch {
      return {};
    }
  }
  return (asRecord(raw) ? cloneJson(raw) : {}) as ExerciseEnrichmentData;
}

// ---------- Wiersze list: tekst + klucze, których formularz nie pokazuje ----------

/** Tekst punktu kontrolnego albo przeciwwskazania; wpis bywa obiektem `{ text, … }` albo samym tekstem. */
export function readTextItem(item: unknown): string {
  if (typeof item === 'string') return item;
  const text = asRecord(item)?.text;
  return typeof text === 'string' ? text : '';
}

/** Zmienia sam tekst wpisu; pozostałe klucze (np. `evidence`, `view`) i kształt wpisu zostają. */
export function withTextItem(item: unknown, text: string): unknown {
  if (typeof item === 'string') return text;
  const record = asRecord(item);
  return record ? { ...record, text } : { text };
}

function cleanTextItem(item: unknown): unknown {
  if (typeof item === 'string') return trimmedText(item);
  const record = asRecord(item);
  const text = trimmedText(record?.text);
  return record && text ? { ...record, text } : null;
}

function cleanMistake(item: unknown): unknown {
  const record = asRecord(item);
  if (!record) return null;
  const mistake = trimmedText(record.mistake);
  const fix = trimmedText(record.fix);
  if (!mistake && !fix) return null;
  const cleaned: UnknownRecord = { ...record };
  for (const [key, text] of [
    ['mistake', mistake],
    ['fix', fix],
  ] as const) {
    if (text) cleaned[key] = text;
    else delete cleaned[key];
  }
  return cleaned;
}

function cleanEquipmentItem(item: unknown): unknown {
  const record = asRecord(item);
  if (!record) return null;
  const label = trimmedText(record.label);
  if (!label && !trimmedText(record.code)) return null;
  const cleaned: UnknownRecord = { ...record };
  if (label) cleaned.label = label;
  else delete cleaned.label;
  if ('qty' in cleaned && !(typeof cleaned.qty === 'number' && Number.isFinite(cleaned.qty) && cleaned.qty > 0)) {
    delete cleaned.qty;
  }
  if (Array.isArray(cleaned.substitutes)) {
    cleaned.substitutes = cleaned.substitutes.map(trimmedText).filter((text) => text !== null);
  }
  return cleaned;
}

/**
 * Lista po edycji albo `null`, gdy nic się nie zmieniło. Wiersz, którego fizjoterapeuta nie ruszył,
 * wraca dokładnie w zapisanej postaci.
 */
function editedRows(
  loadedValue: unknown,
  draftValue: unknown,
  cleanRow: (row: unknown) => unknown
): { rows: unknown[] } | null {
  const loadedRows = asList(loadedValue);
  const loadedClean = loadedRows.map(cleanRow);
  const draftClean = asList(draftValue)
    .map(cleanRow)
    .filter((row) => row !== null);
  if (
    sameJson(
      draftClean,
      loadedClean.filter((row) => row !== null)
    )
  ) {
    return null;
  }
  return {
    rows: draftClean.map((row, index) =>
      index < loadedRows.length && sameJson(row, loadedClean[index]) ? loadedRows[index] : row
    ),
  };
}

// ---------- Kroki i wskazówki: listy tekstów z danymi przypiętymi po indeksie ----------

interface PatientLists {
  steps: string[];
  stepImages: unknown[];
  cues: string[];
  cuePhases: unknown[];
}

function textRows(value: unknown): string[] {
  return asList(value).map((entry) => (typeof entry === 'string' ? entry : ''));
}

function nonBlank(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value !== '');
}

/** A link to a step or cue that is no longer on the list. */
function pointsPast(position: unknown, lastPosition: number): boolean {
  return typeof position === 'number' && position > lastPosition;
}

/** Blank steps and cues are dropped on save, so photos and phases linked by index shift with them. */
function cleanPatientLists(document: unknown): PatientLists {
  const patient = asRecord(asRecord(document)?.patient) ?? {};
  const aligned = realignMediaForBlankEntries({
    steps: textRows(patient.steps),
    cues: textRows(patient.cues),
    step_images: asList(patient.step_images),
    cue_phases: asList(patient.cue_phases),
  } as ExerciseEnrichmentPatientV3);
  const steps = nonBlank(aligned.steps ?? []);
  const cues = nonBlank(aligned.cues ?? []);
  return {
    steps,
    stepImages: asList(aligned.step_images).filter((link) => !pointsPast(asRecord(link)?.step, steps.length)),
    cues,
    cuePhases: asList(aligned.cue_phases).filter((link) => !pointsPast(asRecord(link)?.cue, cues.length - 1)),
  };
}

function collectLinkedListEdits(
  edits: V33Edits,
  loaded: unknown,
  listPath: string,
  linksPath: string,
  loadedClean: { list: string[]; links: unknown[] },
  draftClean: { list: string[]; links: unknown[] }
): void {
  if (sameJson(draftClean.list, loadedClean.list) && sameJson(draftClean.links, loadedClean.links)) return;
  if (!sameJson(draftClean.list, getAtPath(loaded, listPath) ?? [])) {
    edits[listPath] = draftClean.list.length > 0 ? draftClean.list : undefined;
  }
  if (!sameJson(draftClean.links, getAtPath(loaded, linksPath) ?? [])) {
    edits[linksPath] = draftClean.links.length > 0 ? draftClean.links : undefined;
  }
}

/**
 * Porównuje szkic formularza z dokumentem wczytanym i zwraca tylko to, co fizjoterapeuta zmienił.
 * Różnice poza `V33_EDITABLE_PATHS` (np. klucze dopisane do szkicu przez AI) są pomijane.
 * Sam biały znak na końcu tekstu ani pusty wiersz listy nie są zmianą.
 */
export function collectV33Edits(loaded: ExerciseEnrichmentData, draft: ExerciseEnrichmentData): V33Edits {
  const edits: V33Edits = {};

  for (const path of TEXT_PATHS) {
    const draftText = trimmedText(getAtPath(draft, path));
    if (draftText !== trimmedText(getAtPath(loaded, path))) edits[path] = draftText ?? undefined;
  }

  const draftSupervision = getAtPath(draft, SUPERVISION_PATH) === true;
  if (draftSupervision !== (getAtPath(loaded, SUPERVISION_PATH) === true)) edits[SUPERVISION_PATH] = draftSupervision;

  const loadedLists = cleanPatientLists(loaded);
  const draftLists = cleanPatientLists(draft);
  collectLinkedListEdits(
    edits,
    loaded,
    STEPS_PATH,
    STEP_IMAGES_PATH,
    { list: loadedLists.steps, links: loadedLists.stepImages },
    { list: draftLists.steps, links: draftLists.stepImages }
  );
  collectLinkedListEdits(
    edits,
    loaded,
    CUES_PATH,
    CUE_PHASES_PATH,
    { list: loadedLists.cues, links: loadedLists.cuePhases },
    { list: draftLists.cues, links: draftLists.cuePhases }
  );

  for (const [path, cleanRow] of [
    [MISTAKES_PATH, cleanMistake],
    [CONTRAINDICATIONS_PATH, cleanTextItem],
    [CHECKPOINTS_PATH, cleanTextItem],
    [EQUIPMENT_ITEMS_PATH, cleanEquipmentItem],
  ] as const) {
    const edited = editedRows(getAtPath(loaded, path), getAtPath(draft, path), cleanRow);
    if (edited) edits[path] = edited.rows.length > 0 ? edited.rows : undefined;
  }

  return edits;
}

/**
 * Dokument do wysłania: kopia wczytanego z nałożonymi zmianami. Bez zmian zwraca kopię równą wejściu.
 * Zmiana spoza `V33_EDITABLE_PATHS` jest pomijana, więc pole wycofane nie może trafić do zapisu.
 */
export function buildV33Document(loaded: ExerciseEnrichmentData, edits: V33Edits): ExerciseEnrichmentData {
  const document = cloneJson(loaded) as UnknownRecord;
  const applied = Object.entries(edits).filter(([path]) => V33_EDITABLE_PATHS.includes(path));
  if (applied.length === 0) return document as ExerciseEnrichmentData;

  for (const [path, value] of applied) {
    if (value === undefined) deleteAtPath(document, path);
    else setAtPath(document, path, cloneJson(value));
  }
  // The backend normalizer keeps unknown keys only for a document that carries the schema marker.
  if (!trimmedText(document.$schema)) document.$schema = ENRICHMENT_SCHEMA_V3;
  return document as ExerciseEnrichmentData;
}

// ---------- Uwagi kliniczne: limit znaków ----------

/**
 * Tekst, który pole uwag przyjmuje po wpisaniu albo wklejeniu. Powyżej limitu dopisać się nie da;
 * za długi tekst zapisany wcześniej wolno skracać.
 */
export function acceptTherapistNoteInput(current: string, next: string): string {
  if (next.length <= THERAPIST_NOTE_MAX_LENGTH || next.length < current.length) return next;
  return current.length > THERAPIST_NOTE_MAX_LENGTH ? current : next.slice(0, THERAPIST_NOTE_MAX_LENGTH);
}

// ---------- „Uzupełnij przez AI” ----------

/** Z odpowiedzi generatora zostają tylko pola, które w 3.3 leżą dokładnie w tym samym miejscu. */
export function pickV33AiFill(aiData: ExerciseEnrichmentData | null | undefined): ExerciseEnrichmentData {
  const normalized = toV3(aiData);
  const source = normalized.patient ?? {};
  const patient: ExerciseEnrichmentPatientV3 = {};
  if (source.summary) patient.summary = source.summary;
  if (source.steps?.length) patient.steps = source.steps;
  if (source.cues?.length) patient.cues = source.cues;
  if (source.mistakes?.length) patient.mistakes = source.mistakes;
  if (source.why) patient.why = source.why;
  if (source.when_to_do) patient.when_to_do = source.when_to_do;
  if (source.should_feel) patient.should_feel = source.should_feel;
  if (source.should_not_feel) patient.should_not_feel = source.should_not_feel;

  const stopIf = normalized.safety?.stop_if;
  return {
    ...(Object.keys(patient).length > 0 ? { patient } : {}),
    ...(stopIf ? { safety: { stop_if: stopIf } } : {}),
  };
}

/** Propozycja AI wypełnia tylko puste pola 3.3; reszta szkicu zostaje nietknięta. */
export function mergeV33AiFill(
  current: ExerciseEnrichmentData,
  aiData: ExerciseEnrichmentData | null | undefined
): ExerciseEnrichmentData {
  return deepMergeFillGaps(current, pickV33AiFill(aiData)) as ExerciseEnrichmentData;
}

/** Ile z sekcji, które AI umie uzupełnić w rekordzie 3.3, ma już treść. */
export function countV33AiFillSections(data: ExerciseEnrichmentData): { filled: number; total: number } {
  const content = readExerciseContent({ enrichmentData: data });
  const sections = [
    content.instruction.summary !== null,
    content.instruction.steps.length > 0,
    content.cues.length > 0,
    content.mistakes.length > 0,
    content.shouldFeel !== null && content.shouldNotFeel !== null,
    content.why !== null && content.whenToDo !== null,
    content.stopIf !== null,
  ];
  return { filled: sections.filter(Boolean).length, total: sections.length };
}

// ---------- Panel „Zaawansowane (JSON)” ----------

/** Odrzuca wklejony dokument, który zgubił wersję: taki rekord czytałby się potem jak stary. */
export function parseV33JsonDocument(rawJson: string): ExerciseEnrichmentData {
  const parsed = parseEnrichmentJson(rawJson);
  if (readExerciseContent({ enrichmentData: parsed }).version !== '3.3') {
    throw new Error(
      'Dokument musi zachować pole „schemaVersion” (3.3 lub wyżej). Bez niego ćwiczenie wróciłoby do starego kształtu.'
    );
  }
  return parsed;
}
