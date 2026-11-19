import type {
  ExerciseDependencyMode,
  ExerciseSetDependencyInput,
  ExerciseSetMappingDependencies,
} from '@/graphql/types';

/** Backend `ExerciseDependencyRules.MaxRequirementsPerMapping`. */
export const MAX_REQUIREMENTS_PER_POSITION = 20;

/** Kod błędu walidacji zależności z backendu; treść błędu jest po polsku i idzie do użytkownika. */
export const EXERCISE_DEPENDENCY_INVALID = 'EXERCISE_DEPENDENCY_INVALID';

export interface DependencyPosition {
  id: string;
  order?: number | null;
  name: string;
  isWarmup: boolean;
  requiresMappingIds: readonly string[];
  dependencyMode: ExerciseDependencyMode;
}

export interface DependencyDraft {
  isWarmup: boolean;
  requiresMappingIds: readonly string[];
  dependencyMode: ExerciseDependencyMode;
}

export type RequirementBlockReason = 'later' | 'warmup';

export interface RequirementOption {
  id: string;
  name: string;
  isWarmup: boolean;
  /** null = można zaznaczyć; `later` = stoi niżej w zestawie; `warmup` = rozgrzewka i tak jest przed. */
  blockedBy: RequirementBlockReason | null;
}

export type DependencyChip = { kind: 'warmup' } | { kind: 'after-warmup' } | { kind: 'after'; name: string } | { kind: 'remind' };

export function normalizeDependencyMode(mode: string | null | undefined): ExerciseDependencyMode {
  return mode?.trim().toLowerCase() === 'remind' ? 'remind' : 'block';
}

/** Kolejność jak w backendzie: `order` rosnąco (brak = na końcu), remis po id (porządek porządkowy). */
export function rankPositions<T extends { id: string; order?: number | null }>(positions: readonly T[]): T[] {
  return [...positions].sort((left, right) => {
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  });
}

/** Pozycje zestawu z polami zależności; brak wpisu (API bez SPEC-061) = bez zależności. */
export function mergeDependencyFields<T extends { id: string; order?: number | null }>(
  mappings: readonly T[],
  dependencies: readonly ExerciseSetMappingDependencies[],
  nameOf: (mapping: T) => string
): DependencyPosition[] {
  const byId = new Map(dependencies.map((entry) => [entry.id, entry]));
  return mappings.map((mapping) => {
    const entry = byId.get(mapping.id);
    return {
      id: mapping.id,
      order: mapping.order,
      name: nameOf(mapping),
      isWarmup: entry?.isWarmup ?? false,
      requiresMappingIds: entry?.requiresMappingIds ?? [],
      dependencyMode: normalizeDependencyMode(entry?.dependencyMode),
    };
  });
}

/** Sekcja „Rozgrzewka” na górze, potem reszta; obie w kolejności zestawu. */
export function splitWarmupSection<T extends { id: string; order?: number | null }>(
  positions: readonly T[],
  isWarmup: (position: T) => boolean
): { warmup: T[]; main: T[] } {
  const ranked = rankPositions(positions);
  return { warmup: ranked.filter(isWarmup), main: ranked.filter((position) => !isWarmup(position)) };
}

/** Okno „Co musi być przed?”: pozostałe pozycje zestawu i powód, gdy nie da się ich wybrać. */
export function buildRequirementOptions(
  positions: readonly DependencyPosition[],
  targetId: string,
  targetIsWarmup: boolean
): RequirementOption[] {
  const ranked = rankPositions(positions);
  const targetRank = ranked.findIndex((position) => position.id === targetId);
  return ranked
    .map((position, rank) => ({ position, rank }))
    .filter(({ position }) => position.id !== targetId)
    .map(({ position, rank }) => {
      let blockedBy: RequirementBlockReason | null = null;
      if (!targetIsWarmup && position.isWarmup) blockedBy = 'warmup';
      else if (targetRank === -1 || rank > targetRank) blockedBy = 'later';
      return { id: position.id, name: position.name, isWarmup: position.isWarmup, blockedBy };
    });
}

/** Wymagania, które da się zapisać: bez siebie, bez powtórzeń, tylko pozycje wybieralne, maks. 20. */
export function sanitizeRequirements(
  requiresMappingIds: readonly string[],
  options: readonly RequirementOption[]
): string[] {
  const selectable = new Set(options.filter((option) => option.blockedBy === null).map((option) => option.id));
  return [...new Set(requiresMappingIds)]
    .filter((id) => selectable.has(id))
    .slice(0, MAX_REQUIREMENTS_PER_POSITION);
}

export function buildDependencyItem(mappingId: string, draft: DependencyDraft): ExerciseSetDependencyInput {
  return {
    mappingId,
    isWarmup: draft.isWarmup,
    requiresMappingIds: [...new Set(draft.requiresMappingIds)].filter((id) => id !== mappingId),
    dependencyMode: draft.dependencyMode === 'remind' ? 'remind' : null,
  };
}

/** Czy pozycja na coś czeka: rozgrzewka zestawu (dla ćwiczeń głównych) albo „Wymaga wcześniej”. */
export function hasPrerequisites(position: DependencyDraft, setHasWarmup: boolean): boolean {
  return (!position.isWarmup && setHasWarmup) || position.requiresMappingIds.length > 0;
}

export function describeDependencyChips(
  position: DependencyPosition,
  positions: readonly DependencyPosition[]
): DependencyChip[] {
  if (position.isWarmup && position.requiresMappingIds.length === 0) return [{ kind: 'warmup' }];
  const names = new Map(positions.map((entry) => [entry.id, entry.name]));
  const setHasWarmup = positions.some((entry) => entry.isWarmup);
  const chips: DependencyChip[] = [];
  if (position.isWarmup) chips.push({ kind: 'warmup' });
  else if (setHasWarmup) chips.push({ kind: 'after-warmup' });
  for (const id of position.requiresMappingIds) {
    const name = names.get(id);
    if (name) chips.push({ kind: 'after', name });
  }
  if (position.dependencyMode === 'remind' && hasPrerequisites(position, setHasWarmup)) chips.push({ kind: 'remind' });
  return chips;
}

/** Pomiar `exercise_set:dependencies_save`: same liczby, bez nazw ćwiczeń. */
export function countDependencyStats(positions: readonly DependencyDraft[]): {
  warmup_count: number;
  requires_count: number;
  remind_count: number;
} {
  return {
    warmup_count: positions.filter((position) => position.isWarmup).length,
    requires_count: positions.reduce((sum, position) => sum + position.requiresMappingIds.length, 0),
    remind_count: positions.filter((position) => position.dependencyMode === 'remind').length,
  };
}

/** Stan zestawu po zapisie jednej pozycji (do pomiaru i podglądu). */
export function applyDependencyDraft(
  positions: readonly DependencyPosition[],
  mappingId: string,
  draft: DependencyDraft
): DependencyPosition[] {
  return positions.map((position) =>
    position.id === mappingId
      ? {
          ...position,
          isWarmup: draft.isWarmup,
          requiresMappingIds: [...draft.requiresMappingIds],
          dependencyMode: draft.dependencyMode,
        }
      : position
  );
}

export interface PrerequisiteCandidate {
  id: string;
  name: string;
  isActive: boolean;
  requiresAssignmentId?: string | null;
}

/**
 * „Przed tym zestawem zrób”: inne aktywne przypisania pacjenta, bez tych, które (pośrednio) wymagają tego zestawu,
 * bo backend odrzuci cykl. Obecny wybór zostaje na liście, nawet gdy przestał być aktywny albo zniknął z listy.
 */
export function buildPrerequisiteOptions(
  assignmentId: string,
  candidates: readonly PrerequisiteCandidate[],
  currentRequiresId: string | null | undefined
): { id: string; name: string }[] {
  const requiresById = new Map(candidates.map((candidate) => [candidate.id, candidate.requiresAssignmentId ?? null]));
  const leadsBackToSelf = (startId: string) => {
    const seen = new Set<string>();
    let cursor: string | null = startId;
    while (cursor && !seen.has(cursor)) {
      if (cursor === assignmentId) return true;
      seen.add(cursor);
      cursor = requiresById.get(cursor) ?? null;
    }
    return false;
  };
  const options = candidates
    .filter((candidate) => candidate.id !== assignmentId)
    .filter((candidate) => candidate.id === currentRequiresId || (candidate.isActive && !leadsBackToSelf(candidate.id)))
    .map((candidate) => ({ id: candidate.id, name: candidate.name }));
  // Wymagany zestaw spoza kandydatów (usunięty z planu albo spoza listy): bez tej pozycji select byłby pusty
  // i terapeuta nie mógłby zdjąć wymagania.
  if (currentRequiresId && !requiresById.has(currentRequiresId)) {
    options.push({ id: currentRequiresId, name: 'Niedostępny zestaw' });
  }
  return options;
}

/**
 * Rozgrzewka z propozycji AI po utworzeniu zestawu: i-ta pozycja w kolejności zestawu odpowiada i-temu ćwiczeniu
 * propozycji (to samo ćwiczenie może wystąpić dwa razy, więc nie łączymy po `exerciseId`).
 */
export function buildWarmupDependencyItems(
  mappings: readonly { id: string; order?: number | null }[],
  warmupFlags: readonly boolean[]
): ExerciseSetDependencyInput[] {
  if (mappings.length !== warmupFlags.length) return [];
  return rankPositions(mappings)
    .filter((_, index) => warmupFlags[index])
    .map((mapping) => buildDependencyItem(mapping.id, { isWarmup: true, requiresMappingIds: [], dependencyMode: 'block' }));
}
