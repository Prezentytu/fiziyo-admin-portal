import { describe, expect, it } from 'vitest';

import type { ExerciseNameProposal, ExerciseNameReviewRow } from '@/graphql/types/exerciseNameReview.types';

import { nameReviewKeyAction } from '../nameReviewKeys';
import {
  countRows,
  DEFAULT_NAME_REVIEW_FILTERS,
  familyOptions,
  filterRows,
  groupByPillar,
  initialDraft,
  NO_FAMILY_LABEL,
  nextRowId,
  orderedRows,
  orderDecisions,
  parseNameReviewUrl,
  serializeNameReviewUrl,
  toDecision,
} from '../nameReviewRows';

function proposal(overrides: Partial<ExerciseNameProposal> = {}): ExerciseNameProposal {
  return {
    proposedName: null,
    proposedIsPillar: false,
    proposedPillarExerciseId: null,
    family: null,
    reason: null,
    proposedAt: null,
    status: 'TODO',
    decidedById: null,
    decidedByName: null,
    decidedAt: null,
    finalName: null,
    addedAlias: null,
    ...overrides,
  };
}

function row(
  exerciseId: string,
  name: string,
  proposalOverrides: Partial<ExerciseNameProposal> | null = {},
  overrides: Partial<ExerciseNameReviewRow> = {}
): ExerciseNameReviewRow {
  return {
    exerciseId,
    name,
    aliases: [],
    isPillar: false,
    pillarExerciseId: null,
    thumbnailUrl: null,
    imageUrl: null,
    videoUrl: null,
    status: 'DRAFT',
    organizationVerificationStatus: 'NOT_SUBMITTED',
    proposal: proposalOverrides === null ? null : proposal(proposalOverrides),
    ...overrides,
  };
}

const pull = row('pull', 'Wznoszenie całego ciała na drążku nachwytem', {
  proposedName: 'Podciąganie nachwytem',
  proposedIsPillar: true,
  family: 'Podciąganie',
});
const chin = row('chin', 'Wznoszenie ciała podchwytem wąsko', {
  proposedName: 'Podciąganie podchwytem wąsko',
  proposedPillarExerciseId: 'pull',
  family: 'Podciąganie',
});
const bug = row(
  'bug',
  'Martwy robak',
  { proposedName: 'Martwy robak', status: 'DONE', family: 'Martwy robak' },
  { isPillar: true, aliases: ['Leżenie tyłem'] }
);
const plain = row('plain', 'Krążenia ramion', null);

describe('initialDraft', () => {
  it('starts a row to review from the AI proposal', () => {
    expect(initialDraft(chin)).toEqual({ name: 'Podciąganie podchwytem wąsko', isPillar: false, pillarId: 'pull' });
  });

  it('shows the saved exercise for a done row and for a row without a proposal', () => {
    expect(initialDraft(bug)).toEqual({ name: 'Martwy robak', isPillar: true, pillarId: null });
    expect(initialDraft(plain)).toEqual({ name: 'Krążenia ramion', isPillar: false, pillarId: null });
  });
});

describe('filterRows', () => {
  const rows = [pull, chin, bug, plain];

  it('shows rows to review by default', () => {
    expect(filterRows(rows, DEFAULT_NAME_REVIEW_FILTERS).map((r) => r.exerciseId)).toEqual(['pull', 'chin', 'plain']);
  });

  it('filters done, pillars, family and name changes', () => {
    const base = { ...DEFAULT_NAME_REVIEW_FILTERS, status: 'all' as const };
    expect(filterRows(rows, { ...base, status: 'done' }).map((r) => r.exerciseId)).toEqual(['bug']);
    expect(filterRows(rows, { ...base, pillarsOnly: true }).map((r) => r.exerciseId)).toEqual(['pull', 'bug']);
    expect(filterRows(rows, { ...base, family: 'Podciąganie' }).map((r) => r.exerciseId)).toEqual(['pull', 'chin']);
    expect(filterRows(rows, { ...base, family: NO_FAMILY_LABEL }).map((r) => r.exerciseId)).toEqual(['plain']);
    expect(filterRows(rows, { ...base, change: 'changes' }).map((r) => r.exerciseId)).toEqual(['pull', 'chin']);
    expect(filterRows(rows, { ...base, change: 'same' }).map((r) => r.exerciseId)).toEqual(['bug', 'plain']);
  });

  it('searches name, proposal and aliases without case or Polish letters', () => {
    const base = { ...DEFAULT_NAME_REVIEW_FILTERS, status: 'all' as const };
    expect(filterRows(rows, { ...base, query: 'PODCIAGANIE wasko' }).map((r) => r.exerciseId)).toEqual(['chin']);
    expect(filterRows(rows, { ...base, query: 'lezenie' }).map((r) => r.exerciseId)).toEqual(['bug']);
    expect(filterRows(rows, { ...base, query: 'drążku' }).map((r) => r.exerciseId)).toEqual(['pull']);
  });
});

describe('countRows and familyOptions', () => {
  it('counts done, to review and rows without a proposal', () => {
    expect(countRows([pull, chin, bug, plain])).toEqual({ total: 4, done: 1, todo: 3, withoutProposal: 1 });
  });

  it('lists families alphabetically with the no-family group last', () => {
    expect(familyOptions([plain, pull, bug])).toEqual(['Martwy robak', 'Podciąganie', NO_FAMILY_LABEL]);
  });
});

describe('groupByPillar', () => {
  it('puts variants under their pillar and the rest in the no-family group', () => {
    const families = groupByPillar([chin, plain, pull, bug]);
    expect(families.map((family) => [family.pillar?.exerciseId ?? null, family.variants.map((v) => v.exerciseId)])).toEqual([
      ['pull', ['chin']],
      ['bug', []],
      [null, ['plain']],
    ]);
    expect(orderedRows(families).map((r) => r.exerciseId)).toEqual(['pull', 'chin', 'bug', 'plain']);
  });

  it('follows edits in the row, not only the proposal', () => {
    const families = groupByPillar([pull, chin], { chin: { name: 'x', isPillar: false, pillarId: null } });
    expect(families.map((family) => family.pillar?.exerciseId ?? null)).toEqual(['pull', null]);
  });

  it('treats a variant of a pillar outside the filtered list as without family', () => {
    expect(groupByPillar([chin])).toEqual([{ pillar: null, variants: [chin] }]);
  });
});

describe('toDecision and orderDecisions', () => {
  it('sends the edited name, and null when the name stays', () => {
    expect(toDecision(chin, { name: '  Podciąganie   podchwytem ', isPillar: false, pillarId: 'pull' })).toEqual({
      exerciseId: 'chin',
      name: 'Podciąganie podchwytem',
      isPillar: false,
      pillarExerciseId: 'pull',
    });
    expect(toDecision(chin, initialDraft(chin), true).name).toBeNull();
    expect(toDecision(bug, initialDraft(bug)).name).toBeNull();
  });

  it('drops the variant of a pillar and saves pillars first', () => {
    expect(toDecision(pull, { name: 'Podciąganie', isPillar: true, pillarId: 'chin' }).pillarExerciseId).toBeNull();
    const ordered = orderDecisions([toDecision(chin, initialDraft(chin)), toDecision(pull, initialDraft(pull))]);
    expect(ordered.map((decision) => decision.exerciseId)).toEqual(['pull', 'chin']);
  });
});

describe('nextRowId', () => {
  it('moves to the next row and back to the previous one at the end', () => {
    expect(nextRowId(['a', 'b', 'c'], 'a')).toBe('b');
    expect(nextRowId(['a', 'b', 'c'], 'c')).toBe('b');
    expect(nextRowId(['a', 'b', 'c'], 'a', new Set(['b']))).toBe('c');
    expect(nextRowId(['a'], 'a', new Set(['a']))).toBeNull();
  });
});

describe('url state', () => {
  it('round-trips filters, view and cursor and keeps defaults out of the address', () => {
    const state = parseNameReviewUrl(
      new URLSearchParams('org=o1&status=done&pillars=1&family=Przysiad&change=same&q=goblet&view=families&row=x')
    );
    expect(state).toEqual({
      organizationId: 'o1',
      status: 'done',
      pillarsOnly: true,
      family: 'Przysiad',
      change: 'same',
      query: 'goblet',
      view: 'families',
      rowId: 'x',
    });
    expect(new URLSearchParams(serializeNameReviewUrl(state)).toString()).toBe(
      'org=o1&status=done&pillars=1&family=Przysiad&change=same&q=goblet&view=families&row=x'
    );
    expect(serializeNameReviewUrl(parseNameReviewUrl(new URLSearchParams('status=bogus')))).toBe('');
  });
});

describe('nameReviewKeyAction', () => {
  it('maps list shortcuts and leaves typing in the name field alone', () => {
    expect(nameReviewKeyAction({ key: 'j', inTextField: false })).toBe('next');
    expect(nameReviewKeyAction({ key: 'ArrowUp', inTextField: false })).toBe('previous');
    expect(nameReviewKeyAction({ key: 'n', inTextField: false })).toBe('keepName');
    expect(nameReviewKeyAction({ key: 'n', inTextField: true })).toBeNull();
    expect(nameReviewKeyAction({ key: 'Enter', inTextField: true })).toBe('done');
    expect(nameReviewKeyAction({ key: 'f', metaKey: true, inTextField: false })).toBeNull();
  });
});
