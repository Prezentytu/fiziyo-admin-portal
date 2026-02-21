import type { AssignedSetInfo, ExerciseSet } from '../types';

/**
 * Filtr zestawów po zapytaniu (nazwa lub opis, bez rozróżniania wielkości liter).
 */
export function filterSetsByQuery<T extends { name: string; description?: string }>(
  sets: ReadonlyArray<T>,
  query: string
): T[] {
  if (!query.trim()) return [...sets];
  const lower = query.toLowerCase();
  return sets.filter(
    (set) =>
      set.name.toLowerCase().includes(lower) ||
      (set.description?.toLowerCase().includes(lower) ?? false)
  );
}

/**
 * Kolejność: przypisane na dole, pustę zestawy (nowo utworzone) na górze.
 * Nie zmienia kolejności wewnątrz tych grup.
 */
export function sortSetsForSelection(
  sets: ReadonlyArray<ExerciseSet>,
  assignedSets: ReadonlyArray<AssignedSetInfo>
): ExerciseSet[] {
  const assignedIds = new Set(assignedSets.map((a) => a.exerciseSetId));
  return [...sets].sort((a, b) => {
    const aAssigned = assignedIds.has(a.id);
    const bAssigned = assignedIds.has(b.id);
    const aEmpty = (a.exerciseMappings?.length ?? 0) === 0;
    const bEmpty = (b.exerciseMappings?.length ?? 0) === 0;

    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    if (aEmpty !== bEmpty) return aEmpty ? -1 : 1;
    return 0;
  });
}
