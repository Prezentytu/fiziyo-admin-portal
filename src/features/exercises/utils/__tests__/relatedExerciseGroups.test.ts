import { describe, expect, it } from 'vitest';

import type { RelatedExercise } from '@/graphql/types/adminExercise.types';

import { buildRelatedExerciseHref, groupRelatedExercises } from '../relatedExerciseGroups';

function related(overrides: Partial<RelatedExercise>): RelatedExercise {
  return {
    id: 'rel',
    relationType: 'REGRESSION',
    targetExerciseId: 'target',
    targetName: 'Cel',
    targetThumbnailUrl: null,
    isTargetAvailable: true,
    difference: null,
    whenToSwitch: null,
    isVerified: false,
    isAISuggested: false,
    ...overrides,
  };
}

describe('groupRelatedExercises', () => {
  it('groups many items per type in fixed order and drops empty groups', () => {
    const groups = groupRelatedExercises([
      related({ id: 'alt', relationType: 'ALTERNATIVE', targetName: 'Zamiennik' }),
      related({ id: 'easy-1', relationType: 'REGRESSION', targetName: 'Łatwe 1' }),
      related({ id: 'easy-2', relationType: 'REGRESSION', targetName: 'Łatwe 2' }),
    ]);

    expect(groups.map((group) => group.title)).toEqual(['Łatwiej', 'Zamiennie']);
    expect(groups[0].items.map((item) => item.id)).toEqual(['easy-1', 'easy-2']);
  });

  it('builds a relative link only for an available target', () => {
    const [group] = groupRelatedExercises([
      related({ id: 'visible', relationType: 'PROGRESSION', targetExerciseId: 'fiziyo-h2g-326' }),
      related({ id: 'hidden', relationType: 'PROGRESSION', targetExerciseId: null, isTargetAvailable: false, targetName: 'Z importu' }),
    ]);

    expect(group.items[0].href).toBe('/exercises/fiziyo-h2g-326');
    expect(group.items[1]).toMatchObject({ href: null, name: 'Z importu' });
  });

  it('never links when the backend marks the target unavailable even if an id leaks through', () => {
    expect(buildRelatedExerciseHref({ isTargetAvailable: false, targetExerciseId: 'x' })).toBeNull();
  });

  it('keeps difference and transition criterion, trimming blanks to null', () => {
    const [group] = groupRelatedExercises([
      related({ difference: '  Bez obciążenia. ', whenToSwitch: '   ' }),
    ]);

    expect(group.items[0]).toMatchObject({ difference: 'Bez obciążenia.', whenToSwitch: null });
  });

  it('puts an unknown future relation type into Podobne instead of dropping it', () => {
    const groups = groupRelatedExercises([
      related({ relationType: 'VARIANT' as RelatedExercise['relationType'] }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['similar']);
  });
});
