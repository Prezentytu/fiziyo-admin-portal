import { readExerciseContent, type ExerciseContentSource } from '@/components/shared/exercise/readExerciseContent';

/** One read-only fact of contract v3.3 as the reviewer sees it; no lines means the record leaves it empty. */
export interface VerificationFact {
  id: string;
  label: string;
  lines: string[];
}

/** Read-only contract facts grouped by the stage the matrix assigns them to. */
export interface VerificationFacts {
  material: VerificationFact[];
  parameters: VerificationFact[];
  instruction: VerificationFact[];
  safety: VerificationFact[];
  therapist: VerificationFact[];
  /** Visible to every reviewer (matrix: „fizjoterapeuta”). */
  classification: VerificationFact[];
  /** Matrix visibility „zespół”: FiziYo team only. */
  team: VerificationFact[];
}

type UnknownRecord = Record<string, unknown>;

const SIDE_MODE_LABELS: Record<string, string> = {
  none: 'Razem',
  each_side: 'Na każdą stronę',
  alternating: 'Naprzemiennie',
  left: 'Tylko lewa',
  right: 'Tylko prawa',
};

const SIDE_NAME_LABELS: Record<string, string> = { left: 'lewa', right: 'prawa', both: 'obie' };

const MEDIA_TYPE_LABELS: Record<string, string> = { image: 'zdjęcie', video: 'film' };

const RANGE_LABELS: Array<[key: string, label: string, unit: string]> = [
  ['sets', 'serie', ''],
  ['reps', 'powtórzenia', ''],
  ['rep_s', 'czas powtórzenia', ' s'],
  ['hold_s', 'przytrzymanie', ' s'],
  ['rest_sets_s', 'przerwa między seriami', ' s'],
  ['rest_reps_s', 'przerwa między powtórzeniami', ' s'],
  ['prep_s', 'przygotowanie', ' s'],
  ['tempo', 'tempo', ''],
  ['rom', 'zakres ruchu', ''],
];

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asText(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function asRecords(value: unknown): UnknownRecord[] {
  return (Array.isArray(value) ? value : []).map(asRecord).filter((item): item is UnknownRecord => item !== null);
}

function asTexts(value: unknown): string[] {
  return (Array.isArray(value) ? value : []).map(asText).filter((text): text is string => text !== null);
}

function joined(parts: Array<string | null>, separator = ' · '): string {
  return parts.filter((part): part is string => part !== null).join(separator);
}

function fact(id: string, label: string, lines: Array<string | null> | string | null): VerificationFact {
  const list = Array.isArray(lines) ? lines : [lines];
  return { id, label, lines: list.filter((line): line is string => line !== null && line !== '') };
}

function parseDocument(value: ExerciseContentSource['enrichmentData']): UnknownRecord {
  if (typeof value !== 'string') return asRecord(value) ?? {};
  try {
    return asRecord(JSON.parse(value)) ?? {};
  } catch {
    return {};
  }
}

function sideName(value: string | null): string | null {
  return value ? (SIDE_NAME_LABELS[value] ?? value) : null;
}

function rangeLine(label: string, unit: string, range: UnknownRecord | null): string | null {
  if (!range) return null;
  const min = asText(range.min);
  const max = asText(range.max);
  const preset = asText(range.default);
  const span = min && max ? `${min}–${max}${unit}` : null;
  const presetText = preset ? `domyślnie ${preset}${unit}` : null;
  if (!span && !presetText) return null;
  return `${label}: ${joined([span, presetText], ', ')}`;
}

function prescriptionStep(step: UnknownRecord | null): string[] {
  const next = asTexts(step?.next);
  return [asText(step?.criterion), next.length > 0 ? `Dalej: ${next.join('; ')}` : null].filter(
    (line): line is string => line !== null
  );
}

/**
 * Every fact of contract v3.3 that the verification center shows read-only, with dictionary codes
 * as stored: the portal has no labels for them yet.
 */
export function buildVerificationFactsV33(exercise: ExerciseContentSource): VerificationFacts {
  const content = readExerciseContent(exercise);
  const document = parseDocument(exercise.enrichmentData);
  const side = asRecord(document.side);
  const prescription = asRecord(document.prescription);
  const params = asRecord(prescription?.params);
  const classification = asRecord(document.classification);
  const muscles = asRecord(classification?.muscles);
  const movement = asRecord(classification?.movement);
  const lifecycle = asRecord(document.lifecycle);
  const media = asRecords(document.media);
  const sideMode = asText(side?.mode);

  return {
    material: [
      fact('side-shown-in-media', 'Strona pokazana w mediach', sideName(content.side.shownInMedia)),
      fact(
        'media',
        'Media z pochodzeniem',
        media.map((item) => {
          const provenance = asRecord(item.provenance);
          const type = asText(item.type);
          return joined([
            asText(item.id),
            type ? (MEDIA_TYPE_LABELS[type] ?? type) : null,
            asText(provenance?.origin),
            asText(provenance?.author),
            asText(provenance?.license),
          ]);
        })
      ),
    ],
    parameters: [
      fact('side-mode', 'Tryb strony', sideMode ? (SIDE_MODE_LABELS[sideMode] ?? sideMode) : null),
      fact(
        'side-per-side-dose',
        'Parametry a strona',
        side ? (content.side.perSideDose ? 'Liczone na każdą stronę osobno' : 'Liczone łącznie') : null
      ),
      fact('side-start', 'Strona startowa', sideName(content.side.start)),
      fact(
        'equipment',
        'Sprzęt',
        content.equipment.map((item) =>
          joined(
            [
              item.qty != null && item.qty !== 1 ? `${item.label} × ${item.qty}` : item.label,
              item.required === true ? 'wymagany' : item.required === false ? 'opcjonalny' : null,
              item.substitutes.length > 0 ? `zamienniki: ${item.substitutes.join(', ')}` : null,
            ],
            ', '
          )
        )
      ),
      fact('prescription-goal', 'Cel', asText(prescription?.goal)),
      fact(
        'prescription-ranges',
        'Zakresy parametrów',
        RANGE_LABELS.map(([key, label, unit]) => rangeLine(label, unit, asRecord(params?.[key])))
      ),
      fact('prescription-progression', 'Progresja', prescriptionStep(asRecord(prescription?.progression))),
      fact('prescription-regression', 'Regresja', prescriptionStep(asRecord(prescription?.regression))),
    ],
    instruction: [
      fact('easier', 'Łatwiej', content.easier),
      fact('harder', 'Trudniej', content.harder),
      fact(
        'breathing',
        'Oddech',
        content.breathing
          ? [content.breathing.text, content.breathing.pattern ? `Wzorzec: ${content.breathing.pattern}` : null]
          : null
      ),
    ],
    safety: [
      fact('pain-rule', 'Reguła bólu', content.painRule),
      fact('safety-flags', 'Flagi bezpieczeństwa', content.safetyFlags),
    ],
    therapist: [
      fact(
        'checkpoints',
        'Punkty kontrolne',
        content.checkpoints.map((checkpoint) => {
          const details = joined(
            [
              checkpoint.evidence ? `dowód: ${checkpoint.evidence}` : null,
              checkpoint.view ? `widok: ${checkpoint.view}` : null,
            ],
            ', '
          );
          return details ? `${checkpoint.text} (${details})` : checkpoint.text;
        })
      ),
      fact('therapist-note', 'Uwagi kliniczne', content.therapistNote),
      fact(
        'indications',
        'Wskazania',
        content.indications.map((indication) => indication.code ?? indication.text)
      ),
    ],
    classification: [
      fact('key', 'Klucz ćwiczenia', asText(document.key)),
      fact('classification-body-region', 'Region ciała', asTexts(classification?.body_region)),
      fact('classification-position', 'Pozycja', asText(classification?.position)),
      fact(
        'classification-movement',
        'Wzorzec ruchu',
        joined([asText(movement?.pattern), asText(movement?.type)]) || null
      ),
      fact('classification-muscles', 'Mięśnie', [
        asTexts(muscles?.primary).length > 0 ? `główne: ${asTexts(muscles?.primary).join(', ')}` : null,
        asTexts(muscles?.secondary).length > 0 ? `pomocnicze: ${asTexts(muscles?.secondary).join(', ')}` : null,
      ]),
      fact('classification-goals', 'Cele', asTexts(classification?.goals)),
      fact(
        'relations',
        'Powiązane ćwiczenia',
        asRecords(document.relations).map((relation) => {
          const target = asText(relation.key) ?? asText(relation.source_key);
          const head = joined([asText(relation.type), target], ' → ');
          return joined([head || null, asText(relation.difference)], ': ');
        })
      ),
    ],
    team: [
      fact(
        'provenance-sources',
        'Źródła',
        asRecords(asRecord(document.provenance)?.sources).map((source) =>
          joined([asText(source.kind), asText(source.source_key), asText(source.role)])
        )
      ),
      fact(
        'media-usage-scope',
        'Zakres użycia mediów',
        media.map((item) => {
          const scope = asText(asRecord(item.provenance)?.usage_scope);
          return scope ? joined([asText(item.id), scope], ': ') : null;
        })
      ),
      fact('lifecycle-availability', 'Dostępność', asText(lifecycle?.availability)),
      fact('lifecycle-status', 'Status', asText(lifecycle?.status)),
      fact(
        'lifecycle-findings',
        'Wynik audytu',
        asRecords(asRecord(lifecycle?.quality)?.findings).map((finding) => {
          const head = joined([asText(finding.code), asText(finding.level), asText(finding.path)]);
          return joined([head || null, asText(finding.text)], ': ');
        })
      ),
    ],
  };
}

/** Column mode that matches a `side.mode` of the document (the `Side` column carries the mode alone). */
const SIDE_COLUMN_BY_MODE: Record<string, string> = {
  none: 'none',
  each_side: 'both',
  alternating: 'alternating',
  left: 'left',
  right: 'right',
};

/** The side column edited in the parameters stage no longer says what `side.mode` of the document says. */
export function sideColumnDiffersFromMode(column: string | null | undefined, mode: string | null): boolean {
  const expected = mode ? SIDE_COLUMN_BY_MODE[mode] : undefined;
  if (!expected) return false;
  return (column?.trim().toLowerCase() || 'none') !== expected;
}
