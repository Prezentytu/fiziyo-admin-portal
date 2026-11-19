import { describe, expect, it } from 'vitest';

import {
  applyDependencyDraft,
  buildDependencyItem,
  buildPrerequisiteOptions,
  buildRequirementOptions,
  buildWarmupDependencyItems,
  countDependencyStats,
  describeDependencyChips,
  mergeDependencyFields,
  normalizeDependencyMode,
  rankPositions,
  sanitizeRequirements,
  splitWarmupSection,
  type DependencyPosition,
} from './exerciseDependencies';

const position = (id: string, order: number | null, extra: Partial<DependencyPosition> = {}): DependencyPosition => ({
  id,
  order,
  name: `Ćwiczenie ${id}`,
  isWarmup: false,
  requiresMappingIds: [],
  dependencyMode: 'block',
  ...extra,
});

describe('normalizeDependencyMode', () => {
  it('treats null and unknown as block (owner decision D1)', () => {
    expect(normalizeDependencyMode(null)).toBe('block');
    expect(normalizeDependencyMode('block')).toBe('block');
    expect(normalizeDependencyMode(' Remind ')).toBe('remind');
  });
});

describe('rankPositions', () => {
  it('orders like the backend: order ascending, missing order last, ties by id', () => {
    const ranked = rankPositions([position('c', null), position('b', 1), position('a', 1), position('d', 0)]);
    expect(ranked.map((entry) => entry.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('mergeDependencyFields', () => {
  it('defaults to no dependencies when the API has no SPEC-061 fields for a mapping', () => {
    const merged = mergeDependencyFields(
      [
        { id: 'a', order: 0, title: 'Mostek' },
        { id: 'b', order: 1, title: 'Przysiad' },
      ],
      [{ id: 'b', isWarmup: true, requiresMappingIds: ['a'], dependencyMode: 'remind' }],
      (mapping) => mapping.title
    );
    expect(merged[0]).toMatchObject({ isWarmup: false, requiresMappingIds: [], dependencyMode: 'block', name: 'Mostek' });
    expect(merged[1]).toMatchObject({ isWarmup: true, requiresMappingIds: ['a'], dependencyMode: 'remind' });
  });
});

describe('splitWarmupSection', () => {
  it('puts warm-up positions first, each section in set order', () => {
    const { warmup, main } = splitWarmupSection(
      [position('a', 0), position('w2', 3, { isWarmup: true }), position('b', 1), position('w1', 2, { isWarmup: true })],
      (entry) => entry.isWarmup
    );
    expect(warmup.map((entry) => entry.id)).toEqual(['w1', 'w2']);
    expect(main.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('buildRequirementOptions', () => {
  const positions = [position('w', 0, { isWarmup: true }), position('a', 1), position('b', 2), position('c', 3)];

  it('allows only positions above the target and greys out later ones', () => {
    const options = buildRequirementOptions(positions, 'b', false);
    expect(options.map((option) => [option.id, option.blockedBy])).toEqual([
      ['w', 'warmup'],
      ['a', null],
      ['c', 'later'],
    ]);
  });

  it('lets a warm-up position require an earlier warm-up', () => {
    const withTwoWarmups = [position('w1', 0, { isWarmup: true }), position('w2', 1, { isWarmup: true })];
    expect(buildRequirementOptions(withTwoWarmups, 'w2', true)).toEqual([
      { id: 'w1', name: 'Ćwiczenie w1', isWarmup: true, blockedBy: null },
    ]);
  });

  it('never offers the target itself', () => {
    expect(buildRequirementOptions(positions, 'a', false).some((option) => option.id === 'a')).toBe(false);
  });
});

describe('sanitizeRequirements', () => {
  it('drops duplicates, later positions and anything over the backend limit', () => {
    const many = Array.from({ length: 25 }, (_, index) => position(`p${String(index).padStart(2, '0')}`, index));
    const target = position('z', 100);
    const options = buildRequirementOptions([...many, target, position('late', 200)], 'z', false);
    const result = sanitizeRequirements(['p00', 'p00', 'late', ...many.map((entry) => entry.id)], options);
    expect(result).toHaveLength(20);
    expect(result).not.toContain('late');
    expect(new Set(result).size).toBe(result.length);
  });
});

describe('buildDependencyItem', () => {
  it('sends null for block and drops self-references', () => {
    expect(
      buildDependencyItem('b', { isWarmup: false, requiresMappingIds: ['a', 'a', 'b'], dependencyMode: 'block' })
    ).toEqual({ mappingId: 'b', isWarmup: false, requiresMappingIds: ['a'], dependencyMode: null });
    expect(buildDependencyItem('b', { isWarmup: true, requiresMappingIds: [], dependencyMode: 'remind' })).toEqual({
      mappingId: 'b',
      isWarmup: true,
      requiresMappingIds: [],
      dependencyMode: 'remind',
    });
  });
});

describe('describeDependencyChips', () => {
  it('marks main exercises of a set with warm-up as „Po rozgrzewce” and lists explicit requirements', () => {
    const positions = [
      position('w', 0, { isWarmup: true }),
      position('a', 1),
      position('b', 2, { requiresMappingIds: ['a'], dependencyMode: 'remind' }),
    ];
    expect(describeDependencyChips(positions[0], positions)).toEqual([{ kind: 'warmup' }]);
    expect(describeDependencyChips(positions[1], positions)).toEqual([{ kind: 'after-warmup' }]);
    expect(describeDependencyChips(positions[2], positions)).toEqual([
      { kind: 'after-warmup' },
      { kind: 'after', name: 'Ćwiczenie a' },
      { kind: 'remind' },
    ]);
  });

  it('shows nothing for a set without dependencies and skips requirements that no longer exist', () => {
    const positions = [position('a', 0), position('b', 1, { requiresMappingIds: ['gone'], dependencyMode: 'remind' })];
    expect(describeDependencyChips(positions[0], positions)).toEqual([]);
    expect(describeDependencyChips(positions[1], positions)).toEqual([{ kind: 'remind' }]);
  });
});

describe('countDependencyStats', () => {
  it('counts the whole set after the save, without exercise names', () => {
    const positions = applyDependencyDraft(
      [position('w', 0, { isWarmup: true }), position('a', 1), position('b', 2)],
      'b',
      { isWarmup: false, requiresMappingIds: ['a'], dependencyMode: 'remind' }
    );
    expect(countDependencyStats(positions)).toEqual({ warmup_count: 1, requires_count: 1, remind_count: 1 });
  });
});

describe('buildPrerequisiteOptions', () => {
  const candidates = [
    { id: 'self', name: 'Kolano', isActive: true, requiresAssignmentId: null },
    { id: 'warm', name: 'Rozgrzewka', isActive: true, requiresAssignmentId: null },
    { id: 'paused', name: 'Wstrzymany', isActive: false, requiresAssignmentId: null },
    { id: 'after', name: 'Po kolanie', isActive: true, requiresAssignmentId: 'self' },
    { id: 'after2', name: 'Po po kolanie', isActive: true, requiresAssignmentId: 'after' },
  ];

  it('offers other active assignments that do not already wait for this one', () => {
    expect(buildPrerequisiteOptions('self', candidates, null).map((option) => option.id)).toEqual(['warm']);
  });

  it('keeps the current choice even when it is no longer active', () => {
    expect(buildPrerequisiteOptions('self', candidates, 'paused').map((option) => option.id)).toEqual([
      'warm',
      'paused',
    ]);
  });
});

describe('buildWarmupDependencyItems', () => {
  it('maps accepted warm-up rows to the created positions by set order', () => {
    expect(
      buildWarmupDependencyItems(
        [
          { id: 'm2', order: 2 },
          { id: 'm0', order: 0 },
          { id: 'm1', order: 1 },
        ],
        [true, false, true]
      )
    ).toEqual([
      { mappingId: 'm0', isWarmup: true, requiresMappingIds: [], dependencyMode: null },
      { mappingId: 'm2', isWarmup: true, requiresMappingIds: [], dependencyMode: null },
    ]);
  });

  it('sends nothing when the created set does not match the proposal or nothing is a warm-up', () => {
    expect(buildWarmupDependencyItems([{ id: 'm0', order: 0 }], [true, false])).toEqual([]);
    expect(buildWarmupDependencyItems([{ id: 'm0', order: 0 }], [false])).toEqual([]);
  });
});
