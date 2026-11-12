/**
 * Zapadka kontraktu 3.3: źródłem listy pól jest złoty rekord (`enrichmentV33.fx-0073.json`), nie lista pisana
 * ręcznie. Każdy liść rekordu musi być edytowalny w portalu, tylko do odczytu albo jawnie pominięty z powodem.
 * Nowe pole w kontrakcie trafia do złotego rekordu i od razu wywraca testy, dopóki ktoś go nie sklasyfikuje,
 * także wtedy, gdy leży w sekcji, której portal nie edytuje.
 */
import { V33_EDITABLE_PATHS } from '../../writeExerciseContent';
import golden from './enrichmentV33.fx-0073.json';

interface PathRule {
  /** Ścieżka albo sekcja dokumentu; obejmuje całe swoje wnętrze. */
  path: string;
  reason: string;
}

interface ReadOnlyRule extends PathRule {
  /**
   * Każdy znany liść sekcji, z `*` w miejscu numeru wiersza listy. Sekcja nie obejmuje swojego wnętrza w ciemno:
   * pole dopisane do niej w złotym rekordzie jest niesklasyfikowane, dopóki ktoś nie zdecyduje, czy portal ma je
   * pokazywać albo edytować, i nie dopisze go tutaj albo do `V33_EDITABLE_PATHS`.
   */
  leaves: readonly string[];
}

/** Pola, które portal pokazuje, ale ich nie zmienia: zapis przenosi je z wczytanego rekordu co do znaku. */
export const V33_READ_ONLY_PATHS: readonly ReadOnlyRule[] = [
  {
    path: 'key',
    reason: 'tożsamość rekordu w bazie wiedzy, nadaje ją import paczki',
    leaves: ['key'],
  },
  {
    path: 'kind',
    reason: 'rodzaj rekordu, nadaje go import paczki',
    leaves: ['kind'],
  },
  {
    path: 'classification',
    reason: 'klasyfikacja z importu; portal edytuje tagi w kolumnach ćwiczenia',
    leaves: [
      'classification.difficulty',
      'classification.position',
      'classification.body_region.*',
      'classification.muscles.primary.*',
      'classification.muscles.secondary',
      'classification.movement.pattern',
      'classification.movement.type',
      'classification.indications.*',
      'classification.goals.*',
      'classification.progression_family',
      'classification.structures',
      'classification.functions',
    ],
  },
  {
    path: 'media',
    reason: 'materiał z importu; zdjęcia i film portal zmienia osobnymi mutacjami',
    leaves: [
      'media.*.id',
      'media.*.type',
      'media.*.url',
      'media.*.order',
      'media.*.layout',
      'media.*.provenance.origin',
      'media.*.provenance.author',
      'media.*.provenance.license',
      'media.*.provenance.usage_scope',
      'media.*.start_s',
      'media.*.end_s',
      'media.*.side_shown',
    ],
  },
  {
    path: 'prescription',
    reason: 'zakresy dawki z importu; dawkę portal zapisuje w kolumnach ćwiczenia',
    leaves: [
      'prescription.goal',
      'prescription.mode',
      'prescription.params.sets.default',
      'prescription.params.sets.min',
      'prescription.params.sets.max',
      'prescription.params.reps.default',
      'prescription.params.reps.min',
      'prescription.params.reps.max',
      'prescription.params.rep_s.default',
      'prescription.params.rep_s.min',
      'prescription.params.rep_s.max',
      'prescription.params.rep_s.source',
      'prescription.params.hold_s.default',
      'prescription.params.hold_s.min',
      'prescription.params.hold_s.max',
      'prescription.params.rest_sets_s.default',
      'prescription.params.rest_sets_s.min',
      'prescription.params.rest_sets_s.max',
      'prescription.params.rest_reps_s.default',
      'prescription.params.rest_reps_s.min',
      'prescription.params.rest_reps_s.max',
      'prescription.params.prep_s.default',
      'prescription.params.prep_s.min',
      'prescription.params.prep_s.max',
      'prescription.params.intensity.default.scale',
      'prescription.params.intensity.default.value',
      'prescription.params.intensity.min',
      'prescription.params.intensity.max',
      'prescription.progression.criterion',
      'prescription.progression.next.*',
      'prescription.regression.criterion',
      'prescription.regression.next.*',
    ],
  },
  {
    path: 'side',
    reason: 'tryb strony z importu; portal go pokazuje i ostrzega przy rozjeździe z kolumną',
    leaves: ['side.mode', 'side.per_side_dose', 'side.start', 'side.shown_in_media'],
  },
  {
    path: 'relations',
    reason: 'powiązania ćwiczeń, sekcja zespołu',
    leaves: [
      'relations.*.type',
      'relations.*.key',
      'relations.*.source_key',
      'relations.*.difference',
      'relations.*.when_to_switch',
      'relations.*.order',
      'relations.*.ai_suggested',
      'relations.*.verified',
    ],
  },
  {
    path: 'provenance',
    reason: 'pochodzenie treści, sekcja zespołu',
    leaves: [
      'provenance.sources.*.kind',
      'provenance.sources.*.source_key',
      'provenance.sources.*.role',
      'provenance.patient.by',
      'provenance.patient.confidence',
    ],
  },
  {
    path: 'lifecycle',
    reason: 'status i audyt jakości, sekcja zespołu',
    leaves: [
      'lifecycle.availability',
      'lifecycle.status',
      'lifecycle.quality.auditor',
      'lifecycle.quality.findings.*.code',
      'lifecycle.quality.findings.*.level',
      'lifecycle.quality.findings.*.path',
      'lifecycle.quality.findings.*.text',
    ],
  },
  {
    path: 'breathing.pattern',
    reason: 'wzorzec oddechu z importu; portal edytuje tylko zdanie o oddechu',
    leaves: ['breathing.pattern'],
  },
  {
    path: 'safety.flags',
    reason: 'flagi bezpieczeństwa z importu, lista zamknięta kontraktu',
    leaves: ['safety.flags.*.code'],
  },
  {
    path: 'safety.pain_rule',
    reason: 'reguła bólu z importu, lista zamknięta kontraktu',
    leaves: ['safety.pain_rule'],
  },
];

/** Pola poza klasyfikacją „edytowalne / tylko do odczytu”, każde z powodem. */
export const V33_SKIPPED_PATHS: readonly PathRule[] = [
  { path: '$schema', reason: 'znacznik formatu; dopisuje go każdy zapis, nie fizjoterapeuta' },
  { path: 'schemaVersion', reason: 'wersja kontraktu; portal jej nie zmienia i nie podnosi' },
];

/** Ścieżki edytowalne, których złoty rekord nie zawiera; bez tej listy zapadka nie widziałaby ich wcale. */
export const V33_EDITABLE_ABSENT_FROM_GOLDEN: readonly PathRule[] = [
  { path: 'patient.step_images', reason: 'rekord fx-0073 nie ma zdjęć przypiętych do kroków' },
  { path: 'safety.precautions', reason: 'rekord fx-0073 nie ma ostrożności dla grup szczególnych' },
  { path: 'therapist.note', reason: 'rekord fx-0073 nie ma uwagi dla fizjoterapeuty' },
];

export type V33PathClass = 'editable' | 'read-only' | 'skipped';

function covers(rule: string, path: string): boolean {
  return path === rule || path.startsWith(`${rule}.`);
}

/** Każdy liść dokumentu jako ścieżka z indeksami (`patient.mistakes.0.fix`); pusta lista jest liściem. */
export function leafPaths(value: unknown, prefix = ''): string[] {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [prefix];
    return entries.flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

export const GOLDEN_LEAF_PATHS: readonly string[] = leafPaths(golden);

/** Liść bez numerów wierszy: `media.1.provenance.origin` → `media.*.provenance.origin`. */
export function leafShape(path: string): string {
  return path
    .split('.')
    .map((key) => (/^\d+$/.test(key) ? '*' : key))
    .join('.');
}

/** Klasy, do których należy liść. Dokładnie jedna albo test pada: zero to pole niesklasyfikowane. */
export function classesOfV33Leaf(path: string): V33PathClass[] {
  const classes: V33PathClass[] = [];
  if (V33_EDITABLE_PATHS.some((rule) => covers(rule, path))) classes.push('editable');
  if (V33_READ_ONLY_PATHS.some((rule) => rule.leaves.includes(leafShape(path)))) classes.push('read-only');
  if (V33_SKIPPED_PATHS.some((rule) => covers(rule.path, path))) classes.push('skipped');
  return classes;
}

/** Wpis z `V33_EDITABLE_PATHS`, pod który podpada liść. */
export function editableRootOf(path: string): string | undefined {
  return V33_EDITABLE_PATHS.find((rule) => covers(rule, path));
}

/** Ścieżki edytowalne obecne w złotym rekordzie, w kolejności listy. */
export const GOLDEN_EDITABLE_PATHS: readonly string[] = V33_EDITABLE_PATHS.filter((rule) =>
  GOLDEN_LEAF_PATHS.some((leaf) => covers(rule, leaf))
);

/**
 * Lista, którą musi pokryć każdy ekran edycji: ścieżki edytowalne ze złotego rekordu plus te, których rekord
 * nie zawiera. Ekran, który którejś nie edytuje, wymienia ją u siebie z powodem.
 */
export const V33_PATHS_EVERY_EDITOR_COVERS: readonly string[] = [
  ...GOLDEN_EDITABLE_PATHS,
  ...V33_EDITABLE_ABSENT_FROM_GOLDEN.map((rule) => rule.path),
];
