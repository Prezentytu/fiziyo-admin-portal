import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  collectV33Edits,
  findV33EditCollisions,
  rebaseV33Draft,
  sameJson,
  type V33EditCollision,
} from '@/components/shared/exercise/writeExerciseContent';

import { deepCloneEnrichment, setEnrichmentAtPath } from '../useEnrichmentDraft';

/** Wybór wersji dla pól zmienionych przez obie osoby: ścieżka → która wersja zostaje. */
export type SaveCollisionResolution = Readonly<Record<string, 'mine' | 'theirs'>>;

/**
 * Listy zapisywane razem: druga trzyma dane przypięte do pierwszej po numerze wiersza (zdjęcie do kroku, faza do
 * wskazówki). Kroki jednej osoby ze zdjęciami drugiej nie mają sensu, więc para jest jedną kolizją z jednym
 * wyborem. Zgodność z regułą zapisu (`rebaseV33Draft`) pilnuje test `saveCollisions.test.ts`.
 */
export const SAVE_COLLISION_LINKED_PATHS: ReadonlyArray<readonly string[]> = [
  ['patient.steps', 'patient.step_images'],
  ['patient.cues', 'patient.cue_phases'],
];

/** Ścieżki, o których decyduje jeden wybór: para powiązanych list albo samo pole. */
export function linkedPathsOf(path: string): readonly string[] {
  return SAVE_COLLISION_LINKED_PATHS.find((group) => group.includes(path)) ?? [path];
}

function getAtPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Every change of `some` is also in `all`, with the same value: nothing of `some` can be lost. */
function containedIn(some: Record<string, unknown>, all: Record<string, unknown>, paths: readonly string[]): boolean {
  return paths.filter((path) => path in some).every((path) => path in all && sameJson(some[path], all[path]));
}

/**
 * Kolizje do rozstrzygnięcia przed wczytaniem aktualnej wersji. Pole pojedyncze: jak w `findV33EditCollisions`.
 * Para powiązanych list: kolizja, gdy obie osoby zmieniły cokolwiek w parze i zmiany nie są tym samym; wtedy
 * zwracane są oba pola pary, każde w wersji z ekranu (`mine`) i z bazy (`theirs`), także to niezmienione.
 */
export function findSaveCollisions(
  loaded: ExerciseEnrichmentData,
  draft: ExerciseEnrichmentData,
  current: ExerciseEnrichmentData
): V33EditCollision[] {
  const mine = collectV33Edits(loaded, draft);
  const theirs = collectV33Edits(loaded, current);
  const linked = new Set(SAVE_COLLISION_LINKED_PATHS.flat());
  const collisions = findV33EditCollisions(loaded, draft, current).filter(({ path }) => !linked.has(path));

  for (const group of SAVE_COLLISION_LINKED_PATHS) {
    const bothChanged = group.some((path) => path in mine) && group.some((path) => path in theirs);
    if (!bothChanged || containedIn(mine, theirs, group) || containedIn(theirs, mine, group)) continue;
    for (const path of group) {
      const untouched = getAtPath(loaded, path);
      collisions.push({
        path,
        mine: path in mine ? mine[path] : untouched,
        theirs: path in theirs ? theirs[path] : untouched,
      });
    }
  }
  return collisions;
}

/**
 * Szkic przeniesiony na aktualną wersję z bazy według wyboru fizjoterapeuty. `null`, gdy którejś kolizji brakuje
 * wyboru albo pola jednej pary mają różne wybory: wtedy nic nie wolno wczytać, bo jedna z wersji znikłaby po cichu.
 * „Moja” wersja pary to obie listy z ekranu, także ta, której fizjoterapeuta nie zmieniał.
 */
export function rebaseDraftWithChoices(
  loaded: ExerciseEnrichmentData,
  draft: ExerciseEnrichmentData,
  current: ExerciseEnrichmentData,
  resolution: SaveCollisionResolution | undefined
): ExerciseEnrichmentData | null {
  const choices = (resolution ?? {}) as Record<string, unknown>;
  const collisions = findSaveCollisions(loaded, draft, current);
  const collided = new Set(collisions.map(({ path }) => path));
  for (const { path } of collisions) {
    const choice = choices[path];
    if (choice !== 'mine' && choice !== 'theirs') return null;
    if (linkedPathsOf(path).some((other) => collided.has(other) && choices[other] !== choice)) return null;
  }

  const keepTheirs = collisions.filter(({ path }) => choices[path] === 'theirs').map(({ path }) => path);
  const rebased = deepCloneEnrichment(rebaseV33Draft(loaded, draft, current, keepTheirs));
  for (const { path } of collisions) {
    if (choices[path] !== 'mine' || linkedPathsOf(path).length === 1) continue;
    const onScreen = getAtPath(draft, path);
    setEnrichmentAtPath(
      rebased as Record<string, unknown>,
      path,
      onScreen === undefined ? undefined : deepCloneEnrichment(onScreen)
    );
  }
  return rebased;
}
