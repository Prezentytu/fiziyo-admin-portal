/**
 * Zapadka kontraktu 3.3: źródłem listy pól jest złoty rekord (`enrichmentV33.fx-0073.json`), nie lista pisana
 * ręcznie. Każdy liść rekordu musi być edytowalny w portalu, tylko do odczytu albo jawnie pominięty z powodem.
 * Nowe pole w kontrakcie trafia do złotego rekordu i od razu wywraca testy, dopóki ktoś go nie sklasyfikuje.
 */
import { V33_EDITABLE_PATHS } from '../../writeExerciseContent';
import golden from './enrichmentV33.fx-0073.json';

interface PathRule {
  /** Ścieżka albo sekcja dokumentu; obejmuje całe swoje wnętrze. */
  path: string;
  reason: string;
}

/** Pola, które portal pokazuje, ale ich nie zmienia: zapis przenosi je z wczytanego rekordu co do znaku. */
export const V33_READ_ONLY_PATHS: readonly PathRule[] = [
  { path: 'key', reason: 'tożsamość rekordu w bazie wiedzy, nadaje ją import paczki' },
  { path: 'kind', reason: 'rodzaj rekordu, nadaje go import paczki' },
  { path: 'classification', reason: 'klasyfikacja z importu; portal edytuje tagi w kolumnach ćwiczenia' },
  { path: 'media', reason: 'materiał z importu; zdjęcia i film portal zmienia osobnymi mutacjami' },
  { path: 'prescription', reason: 'zakresy dawki z importu; dawkę portal zapisuje w kolumnach ćwiczenia' },
  { path: 'side', reason: 'tryb strony z importu; portal go pokazuje i ostrzega przy rozjeździe z kolumną' },
  { path: 'relations', reason: 'powiązania ćwiczeń, sekcja zespołu' },
  { path: 'provenance', reason: 'pochodzenie treści, sekcja zespołu' },
  { path: 'lifecycle', reason: 'status i audyt jakości, sekcja zespołu' },
  { path: 'breathing.pattern', reason: 'wzorzec oddechu z importu; portal edytuje tylko zdanie o oddechu' },
  { path: 'safety.flags', reason: 'flagi bezpieczeństwa z importu, lista zamknięta kontraktu' },
  { path: 'safety.pain_rule', reason: 'reguła bólu z importu, lista zamknięta kontraktu' },
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

/** Klasy, do których należy liść. Dokładnie jedna albo test pada: zero to pole niesklasyfikowane. */
export function classesOfV33Leaf(path: string): V33PathClass[] {
  const classes: V33PathClass[] = [];
  if (V33_EDITABLE_PATHS.some((rule) => covers(rule, path))) classes.push('editable');
  if (V33_READ_ONLY_PATHS.some((rule) => covers(rule.path, path))) classes.push('read-only');
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
