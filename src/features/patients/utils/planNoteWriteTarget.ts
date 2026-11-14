/**
 * Gdzie zapisać uwagę do ćwiczenia z „Dostosuj parametry” (S-01 R1, FR-007 6e). Uwaga należy do pozycji planu
 * pacjenta (`ExerciseSetMapping.notes`), bo tylko tam backend stawia `notesUpdatedAt`, z którego idą „Nowa”
 * w aplikacji i push. `updateExerciseInSet` szuka pozycji po parze zestaw + ćwiczenie, więc zapis jest bezpieczny
 * tylko wtedy, gdy ćwiczenie występuje w zestawie raz. Szablon, ćwiczenie dodane pacjentowi poza zestawem
 * i powtórzone ćwiczenie zostają przy nadpisaniu przypisania, jak dotąd.
 */
export interface PlanNoteTarget {
  exerciseSetId: string;
  exerciseId: string;
}

interface PlanNoteSet {
  id?: string | null;
  kind?: string | null;
  exerciseMappings?: ({ id?: string | null; exerciseId?: string | null } | null)[] | null;
}

interface PlanNoteMapping {
  id?: string | null;
  exerciseId?: string | null;
}

export function resolvePlanNoteTarget(
  set: PlanNoteSet | null | undefined,
  mapping: PlanNoteMapping | null | undefined
): PlanNoteTarget | null {
  const exerciseSetId = set?.id;
  const exerciseId = mapping?.exerciseId;
  if (!set || set.kind !== 'PATIENT_PLAN' || !exerciseSetId || !exerciseId || !mapping?.id) return null;
  const mappings = set.exerciseMappings ?? [];
  if (!mappings.some((item) => item?.id === mapping.id)) return null;
  const sameExercise = mappings.filter((item) => item?.exerciseId === exerciseId).length;
  return sameExercise === 1 ? { exerciseSetId, exerciseId } : null;
}
