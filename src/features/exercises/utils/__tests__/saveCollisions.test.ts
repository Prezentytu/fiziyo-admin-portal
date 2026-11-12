import { describe, expect, it } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import {
  collectV33Edits,
  rebaseV33Draft,
  V33_EDITABLE_PATHS,
} from '@/components/shared/exercise/writeExerciseContent';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { linkedPathsOf, SAVE_COLLISION_LINKED_PATHS } from '../saveCollisions';

type Doc = Record<string, Record<string, unknown>>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The golden record with every editable field filled, lists with at least two rows. */
function loadedDocument(): Doc {
  const loaded = clone(fixture) as unknown as Doc;
  loaded.patient.step_images = [
    { step: 1, url: 'https://example.test/1.jpg' },
    { step: 8, url: 'https://example.test/8.jpg' },
  ];
  loaded.safety.precautions = [
    { group: 'other', text: 'Pierwsza ostrożność.' },
    { group: 'other', text: 'Druga ostrożność.' },
  ];
  loaded.safety.contraindications = [...(loaded.safety.contraindications as unknown[]), { text: 'Drugie.' }];
  loaded.therapist.note = 'Uwaga dla fizjoterapeuty.';
  return loaded;
}

/** A draft in which the therapist changed every editable field. */
function draftChangingEverything(loaded: Doc): Doc {
  const draft = clone(loaded);
  for (const path of V33_EDITABLE_PATHS) {
    const keys = path.split('.');
    const parent = keys.length === 2 ? draft[keys[0]] : (draft as Record<string, unknown>);
    const key = keys[keys.length - 1];
    const value = parent[key];
    if (typeof value === 'string') parent[key] = `${value} (zmiana)`;
    else if (typeof value === 'boolean') parent[key] = !value;
    else if (Array.isArray(value) && value.length > 1) parent[key] = value.slice(0, -1);
    else throw new Error(`Brak wartości do zmiany w ${path}`);
  }
  return draft;
}

describe('pary powiązanych list w komunikacie kolizji zgadzają się z regułą zapisu', () => {
  const loaded = loadedDocument() as ExerciseEnrichmentData;
  const draft = draftChangingEverything(loadedDocument()) as ExerciseEnrichmentData;

  it('szkic testowy zmienia każde pole edytowalne', () => {
    expect(Object.keys(collectV33Edits(loaded, draft)).sort()).toEqual([...V33_EDITABLE_PATHS].sort());
  });

  it.each(V33_EDITABLE_PATHS.map((path) => [path] as const))(
    'odrzucenie zmiany w %s odrzuca dokładnie te pola, które komunikat pokazuje jako jeden wybór',
    (path) => {
      const kept = Object.keys(collectV33Edits(loaded, rebaseV33Draft(loaded, draft, loaded, [path])));
      const rejected = V33_EDITABLE_PATHS.filter((candidate) => !kept.includes(candidate));

      expect(rejected.sort()).toEqual([...linkedPathsOf(path)].sort());
    }
  );

  it('każda para składa się z pól edytowalnych i żadne pole nie jest w dwóch parach', () => {
    const all = SAVE_COLLISION_LINKED_PATHS.flat();
    expect(all.filter((path) => !V33_EDITABLE_PATHS.includes(path))).toEqual([]);
    expect(new Set(all).size).toBe(all.length);
  });
});
