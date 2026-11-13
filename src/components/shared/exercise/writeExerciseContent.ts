/**
 * Wspólny zapis treści ćwiczenia w kontrakcie v3.3 (FR-007). Para dla `readExerciseContent`.
 *
 * Jedno miejsce na trzy reguły, z których korzysta każdy ekran zapisujący dokument (formularz ćwiczenia,
 * centrum weryfikacji):
 * 1. `V33_EDITABLE_PATHS`: jedyne ścieżki dokumentu, które portal może zmienić.
 * 2. Dokument do wysłania powstaje z dokumentu WCZYTANEGO, na który nakładamy tylko zmienione ścieżki;
 *    sekcje zespołu, klucze spoza kontraktu, puste wartości i `schemaVersion` wracają do bazy bez zmian.
 * 3. Zapis zawsze niesie znacznik `$schema`: backend bez niego czyta dokument jak v2 i buduje go od nowa.
 *
 * Słowniki zapisywane przez portal (kody grup ostrożności, fazy wskazówek) też są tutaj, żeby do bazy
 * nie trafiła wartość spoza listy zamkniętej kontraktu.
 */
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';
import { realignMediaForBlankEntries } from '@/features/verification/utils/stepMedia';
import type {
  EnrichmentCuePhaseV3,
  ExerciseEnrichmentData,
  ExerciseEnrichmentPatientV3,
} from '@/graphql/types/exerciseEnrichment.types';

// ---------- Słowniki kontraktu zapisywane przez portal ----------

/**
 * Kody grup szczególnych z kontraktu v3.3 §6.1 (lista zamknięta), w kolejności kontraktu, z etykietą dla
 * fizjoterapeuty. Źródło: `fiziyo-research/feature-requests/FR-007-schemat-v3/KONTRAKT-v3.3.md`.
 */
export const V33_PRECAUTION_GROUPS = [
  { code: 'hip_replacement', label: 'Endoproteza biodra' },
  { code: 'knee_replacement', label: 'Endoproteza kolana' },
  { code: 'shoulder_instability_postop', label: 'Bark po zwichnięciu, niestabilny albo po operacji' },
  { code: 'post_surgery_injury', label: 'Po operacji albo świeżym urazie' },
  { code: 'pregnancy_postpartum', label: 'Ciąża i połóg' },
  { code: 'fall_risk', label: 'Ryzyko upadku, zaburzenia równowagi, zawroty głowy' },
  { code: 'osteoporosis', label: 'Osteoporoza, złamanie kręgu' },
  { code: 'diabetic_foot', label: 'Cukrzyca z gorszym czuciem stóp, rana stopy' },
  { code: 'hypertension_heart_glaucoma', label: 'Nadciśnienie, choroba serca, jaskra' },
  { code: 'hypermobility', label: 'Nadmierna ruchomość stawów' },
  { code: 'spinal_stenosis', label: 'Zwężenie kanału kręgowego, kręgozmyk' },
  { code: 'bone_metastasis', label: 'Przerzuty do kości' },
  { code: 'anticoagulants', label: 'Leki przeciwzakrzepowe' },
  { code: 'cervical_risk', label: 'Szyja: RZS, niestabilność, świeży uraz' },
  { code: 'hernia_pelvic_floor', label: 'Przepuklina, dolegliwości dna miednicy' },
  { code: 'other', label: 'Inna grupa, opisana w zdaniu' },
] as const;

export type V33PrecautionGroupCode = (typeof V33_PRECAUTION_GROUPS)[number]['code'];

export const V33_PRECAUTION_GROUP_CODES: readonly string[] = V33_PRECAUTION_GROUPS.map((group) => group.code);

/** Kod grupy dla ostrożności dopisanej w portalu; wiersze wczytane zachowują swój `group`. */
export const NEW_PRECAUTION_GROUP: V33PrecautionGroupCode = 'other';

/** Etykieta grupy szczególnej; kod spoza słownika (stary zapis) pokazujemy bez zmian. */
export function precautionGroupLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return V33_PRECAUTION_GROUPS.find((group) => group.code === code)?.label ?? code;
}

/** Fazy wskazówki z kontraktu (§1, `patient.cue_phases`). */
export const V33_CUE_PHASES: readonly EnrichmentCuePhaseV3[] = ['preparation', 'work', 'rest'];

/**
 * Stałe słownikowe, które portal sam wpisuje do dokumentu (nie przepisuje z wczytanego rekordu).
 * Ścieżka → dozwolone wartości z kontraktu. Test porównuje z tą listą każdą stałą zapisywaną przez ekrany.
 */
export const V33_WRITTEN_DICTIONARIES: Readonly<Record<string, readonly string[]>> = {
  'safety.precautions[].group': V33_PRECAUTION_GROUP_CODES,
  'patient.cue_phases[].phase': V33_CUE_PHASES,
};

// ---------- Ścieżki ----------

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
const PRECAUTIONS_PATH = 'safety.precautions';
const CHECKPOINTS_PATH = 'therapist.checkpoints';
const EQUIPMENT_ITEMS_PATH = 'equipment_items';
const KEYWORDS_PATH = 'ai.keywords';

/** Jedyne ścieżki dokumentu 3.3, które zapis z portalu (formularz, weryfikacja) może zmienić. */
export const V33_EDITABLE_PATHS: readonly string[] = [
  ...TEXT_PATHS,
  SUPERVISION_PATH,
  STEPS_PATH,
  STEP_IMAGES_PATH,
  CUES_PATH,
  CUE_PHASES_PATH,
  MISTAKES_PATH,
  CONTRAINDICATIONS_PATH,
  PRECAUTIONS_PATH,
  CHECKPOINTS_PATH,
  EQUIPMENT_ITEMS_PATH,
  KEYWORDS_PATH,
];

/** Ścieżka szkicu, której zmiana trafi do zapisu: wpis z listy albo jego wnętrze (`patient.steps.2`). */
export function isV33EditablePath(path: string): boolean {
  return V33_EDITABLE_PATHS.some((editable) => path === editable || path.startsWith(`${editable}.`));
}

/**
 * Ścieżki dokumentu 3.3, które backend oddaje pacjentowi (`ExerciseClinicalFieldsAccess.PatientEnrichmentPathsV3`
 * w fizjo-app, kolumna „api-pacjenta” macierzy FR-007), bez znaczników wersji i bez kluczy wycofanych w §2
 * (`safety.intensity_guide`, `equipment`). Każda musi być widoczna w centrum weryfikacji.
 */
export const V33_PATIENT_VISIBLE_PATHS: readonly string[] = [
  'patient.summary',
  'patient.steps',
  'patient.step_images',
  'patient.cues',
  'patient.cue_phases',
  'patient.mistakes',
  'patient.why',
  'patient.when_to_do',
  'patient.should_feel',
  'patient.should_not_feel',
  'patient.easier',
  'patient.harder',
  'breathing.text',
  'side.mode',
  'side.per_side_dose',
  'side.start',
  'side.shown_in_media',
  'equipment_items',
  'safety.stop_if',
  'safety.precautions',
  'safety.requires_supervision',
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

/**
 * Ta sama wartość JSON. Kolejność kluczy obiektu nie ma znaczenia (kolumna JSONB oddaje je w innej, niż dostała),
 * kolejność elementów listy ma. Klucz z wartością `null` to co innego niż brak klucza.
 */
function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));
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

// ---------- Wiersze list: tekst + klucze, których ekran nie pokazuje ----------

/** Tekst punktu kontrolnego, przeciwwskazania albo ostrożności; wpis bywa obiektem `{ text, … }` albo samym tekstem. */
export function readTextItem(item: unknown): string {
  if (typeof item === 'string') return item;
  const text = asRecord(item)?.text;
  return typeof text === 'string' ? text : '';
}

/** Zmienia sam tekst wpisu; pozostałe klucze (np. `evidence`, `view`, `group`) i kształt wpisu zostają. */
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
 * Porównuje szkic ekranu z dokumentem wczytanym i zwraca tylko to, co fizjoterapeuta zmienił.
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
    [PRECAUTIONS_PATH, cleanTextItem],
    [CHECKPOINTS_PATH, cleanTextItem],
    [EQUIPMENT_ITEMS_PATH, cleanEquipmentItem],
    [KEYWORDS_PATH, trimmedText],
  ] as const) {
    const edited = editedRows(getAtPath(loaded, path), getAtPath(draft, path), cleanRow);
    if (edited) edits[path] = edited.rows.length > 0 ? edited.rows : undefined;
  }

  return edits;
}

/**
 * Dokument do wysłania: kopia wczytanego z nałożonymi zmianami i ze znacznikiem `$schema`.
 * Zmiana spoza `V33_EDITABLE_PATHS` jest pomijana, więc pole wycofane nie może trafić do zapisu.
 */
export function buildV33Document(loaded: ExerciseEnrichmentData, edits: V33Edits): ExerciseEnrichmentData {
  const document = cloneJson(loaded) as UnknownRecord;
  for (const [path, value] of Object.entries(edits)) {
    if (!V33_EDITABLE_PATHS.includes(path)) continue;
    if (value === undefined) deleteAtPath(document, path);
    else setAtPath(document, path, cloneJson(value));
  }
  // Backend (`EnrichmentNormalizer.IsAlreadyV3`) przepuszcza dokument w całości tylko z dokładnie tym znacznikiem;
  // bez niego buduje go od nowa z kluczy v2 i gubi `schemaVersion`, `classification`, `side`, `media`.
  if (document.$schema !== ENRICHMENT_SCHEMA_V3) document.$schema = ENRICHMENT_SCHEMA_V3;
  return document as ExerciseEnrichmentData;
}

// ---------- Ochrona przed nadpisaniem cudzej zmiany ----------

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonical(record[key])])
  );
}

function withoutSchemaMarker(document: unknown): unknown {
  const record = asRecord(document);
  if (!record) return {};
  const { $schema: _marker, ...rest } = record;
  return rest;
}

/**
 * Czy dokument w bazie jest nadal tym, który ekran wczytał (albo ostatnio zapisał). Kolejność kluczy nie ma
 * znaczenia (kolumna JSONB jej nie trzyma), znacznik `$schema` też nie (dopisuje go zapis albo backend).
 */
export function isSameV33Document(
  first: ExerciseEnrichmentData | string | null | undefined,
  second: ExerciseEnrichmentData | string | null | undefined
): boolean {
  return sameJson(withoutSchemaMarker(loadV33Document(first)), withoutSchemaMarker(loadV33Document(second)));
}

/** Pole zmienione i na tym ekranie, i w bazie od wczytania. `undefined` znaczy: pole opróżnione. */
export interface V33EditCollision {
  path: string;
  /** Niezapisana wartość z ekranu. */
  mine: unknown;
  /** Wartość zapisana w bazie przez kogoś innego. */
  theirs: unknown;
}

/** Listy zapisywane parami: kroki ze zdjęciami, wskazówki z fazami. Wybór wersji dotyczy całej pary. */
const LINKED_PATHS: ReadonlyArray<readonly [string, string]> = [
  [STEPS_PATH, STEP_IMAGES_PATH],
  [CUES_PATH, CUE_PHASES_PATH],
];

function withLinkedPaths(paths: readonly string[]): Set<string> {
  const all = new Set(paths);
  for (const pair of LINKED_PATHS) {
    if (pair.some((path) => all.has(path))) pair.forEach((path) => all.add(path));
  }
  return all;
}

/**
 * Pola, które fizjoterapeuta zmienił na ekranie (`draft` względem `loaded`), a ktoś inny zmienił w bazie
 * (`current` względem `loaded`) na inną wartość. Tu przeniesienie szkicu musiałoby skasować jedną z wersji,
 * więc ekran pokazuje obie i pyta, która zostaje.
 */
export function findV33EditCollisions(
  loaded: ExerciseEnrichmentData,
  draft: ExerciseEnrichmentData,
  current: ExerciseEnrichmentData
): V33EditCollision[] {
  const mine = collectV33Edits(loaded, draft);
  const theirs = collectV33Edits(loaded, current);
  return Object.keys(mine)
    .filter((path) => path in theirs && !sameJson(mine[path], theirs[path]))
    .map((path) => ({ path, mine: mine[path], theirs: theirs[path] }));
}

/**
 * Szkic przeniesiony na aktualną wersję z bazy: dokument `current` z nałożonymi niezapisanymi zmianami
 * fizjoterapeuty (różnica `draft` względem `loaded`). Cudza zmiana w innym polu zostaje. W polu zmienionym
 * przez obie osoby zostaje wersja z ekranu, chyba że ścieżka jest w `keepTheirs`: wtedy zmiana z ekranu jest
 * odrzucana i zostaje wersja z bazy (razem z listą z nią sparowaną).
 */
export function rebaseV33Draft(
  loaded: ExerciseEnrichmentData,
  draft: ExerciseEnrichmentData,
  current: ExerciseEnrichmentData,
  keepTheirs: readonly string[] = []
): ExerciseEnrichmentData {
  const rejected = withLinkedPaths(keepTheirs);
  const rebased = cloneJson(current) as UnknownRecord;
  for (const [path, value] of Object.entries(collectV33Edits(loaded, draft))) {
    if (rejected.has(path)) continue;
    if (value === undefined) deleteAtPath(rebased, path);
    else setAtPath(rebased, path, cloneJson(value));
  }
  return rebased as ExerciseEnrichmentData;
}
