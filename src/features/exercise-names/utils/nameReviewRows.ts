import type { ExerciseNameDecisionInput, ExerciseNameReviewRow } from '@/graphql/types/exerciseNameReview.types';

/** What the row shows and what "Zrobione" saves. */
export interface NameReviewDraft {
  name: string;
  isPillar: boolean;
  pillarId: string | null;
}

export type NameReviewStatusFilter = 'todo' | 'done' | 'all';
export type NameReviewChangeFilter = 'all' | 'changes' | 'same';
export type NameReviewView = 'list' | 'families';

export interface NameReviewFilters {
  status: NameReviewStatusFilter;
  pillarsOnly: boolean;
  family: string | null;
  change: NameReviewChangeFilter;
  query: string;
}

export interface NameReviewUrlState extends NameReviewFilters {
  organizationId: string | null;
  view: NameReviewView;
  /** Exercise under the keyboard cursor. */
  rowId: string | null;
}

export const DEFAULT_NAME_REVIEW_FILTERS: NameReviewFilters = {
  status: 'todo',
  pillarsOnly: false,
  family: null,
  change: 'all',
  query: '',
};

export const NO_FAMILY_LABEL = 'Bez rodziny';

export function isDone(row: ExerciseNameReviewRow): boolean {
  return row.proposal?.status === 'DONE';
}

/** A row to review starts from the AI proposal; a done row (or one without a proposal) shows the saved exercise. */
export function initialDraft(row: ExerciseNameReviewRow): NameReviewDraft {
  if (isDone(row) || !row.proposal) {
    return { name: row.name, isPillar: row.isPillar, pillarId: row.pillarExerciseId };
  }
  return {
    name: row.proposal.proposedName ?? row.name,
    isPillar: row.proposal.proposedIsPillar,
    pillarId: row.proposal.proposedIsPillar ? null : row.proposal.proposedPillarExerciseId,
  };
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** For done rows a rename is known from the alias the decision added. */
export function nameChanges(row: ExerciseNameReviewRow): boolean {
  if (isDone(row)) {
    return Boolean(row.proposal?.addedAlias);
  }
  const proposed = row.proposal?.proposedName;
  return Boolean(proposed) && normalizeName(proposed ?? '') !== row.name;
}

export function effectiveIsPillar(row: ExerciseNameReviewRow, draft?: NameReviewDraft): boolean {
  return (draft ?? initialDraft(row)).isPillar;
}

export function effectivePillarId(row: ExerciseNameReviewRow, draft?: NameReviewDraft): string | null {
  const current = draft ?? initialDraft(row);
  return current.isPillar ? null : current.pillarId;
}

export function foldText(value: string): string {
  return value
    .toLocaleLowerCase('pl')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function matchesQuery(row: ExerciseNameReviewRow, query: string, draft?: NameReviewDraft): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const haystack = foldText(
    [row.name, row.proposal?.proposedName ?? '', draft?.name ?? '', row.proposal?.family ?? '', ...row.aliases].join(' ')
  );
  return words.every((word) => haystack.includes(word));
}

export function filterRows(
  rows: ReadonlyArray<ExerciseNameReviewRow>,
  filters: NameReviewFilters,
  drafts: Readonly<Record<string, NameReviewDraft>> = {}
): ExerciseNameReviewRow[] {
  return rows.filter((row) => {
    const done = isDone(row);
    if (filters.status === 'todo' && done) return false;
    if (filters.status === 'done' && !done) return false;
    if (filters.pillarsOnly && !effectiveIsPillar(row, drafts[row.exerciseId])) return false;
    if (filters.family !== null && (row.proposal?.family ?? NO_FAMILY_LABEL) !== filters.family) return false;
    if (filters.change === 'changes' && !nameChanges(row)) return false;
    if (filters.change === 'same' && nameChanges(row)) return false;
    return matchesQuery(row, filters.query, drafts[row.exerciseId]);
  });
}

export interface NameReviewCounts {
  total: number;
  done: number;
  todo: number;
  withoutProposal: number;
}

export function countRows(rows: ReadonlyArray<ExerciseNameReviewRow>): NameReviewCounts {
  const done = rows.filter(isDone).length;
  return {
    total: rows.length,
    done,
    todo: rows.length - done,
    withoutProposal: rows.filter((row) => !isDone(row) && !row.proposal?.proposedName).length,
  };
}

export function familyOptions(rows: ReadonlyArray<ExerciseNameReviewRow>): string[] {
  const families = new Set(rows.map((row) => row.proposal?.family ?? NO_FAMILY_LABEL));
  return [...families].sort((left, right) => {
    if (left === NO_FAMILY_LABEL) return 1;
    if (right === NO_FAMILY_LABEL) return -1;
    return left.localeCompare(right, 'pl');
  });
}

export interface PillarFamily {
  pillar: ExerciseNameReviewRow | null;
  variants: ExerciseNameReviewRow[];
}

/** Rows that are neither a visible pillar nor its variant land in the trailing group with `pillar: null`. */
export function groupByPillar(
  rows: ReadonlyArray<ExerciseNameReviewRow>,
  drafts: Readonly<Record<string, NameReviewDraft>> = {}
): PillarFamily[] {
  const pillars = rows.filter((row) => effectiveIsPillar(row, drafts[row.exerciseId]));
  const pillarIds = new Set(pillars.map((row) => row.exerciseId));
  const families = pillars.map<PillarFamily>((pillar) => ({
    pillar,
    variants: rows.filter((row) => effectivePillarId(row, drafts[row.exerciseId]) === pillar.exerciseId),
  }));
  const orphans = rows.filter((row) => {
    if (pillarIds.has(row.exerciseId)) return false;
    const pillarId = effectivePillarId(row, drafts[row.exerciseId]);
    return pillarId === null || !pillarIds.has(pillarId);
  });
  return orphans.length > 0 ? [...families, { pillar: null, variants: orphans }] : families;
}

export function orderedRows(families: ReadonlyArray<PillarFamily>): ExerciseNameReviewRow[] {
  return families.flatMap((family) => (family.pillar ? [family.pillar, ...family.variants] : family.variants));
}

export function pillarCandidates(
  rows: ReadonlyArray<ExerciseNameReviewRow>,
  exceptId: string,
  drafts: Readonly<Record<string, NameReviewDraft>> = {}
): ExerciseNameReviewRow[] {
  return rows.filter(
    (row) => row.exerciseId !== exceptId && (row.isPillar || effectiveIsPillar(row, drafts[row.exerciseId]))
  );
}

export function toDecision(
  row: ExerciseNameReviewRow,
  draft: NameReviewDraft,
  keepName = false
): ExerciseNameDecisionInput {
  const name = normalizeName(draft.name);
  return {
    exerciseId: row.exerciseId,
    name: keepName || name === row.name ? null : name,
    isPillar: draft.isPillar,
    pillarExerciseId: draft.isPillar ? null : draft.pillarId,
  };
}

/** Backend `ExerciseNameReviewService.MaxDecisionsPerCall`: a longer list is refused as a whole. */
export const NAME_DECISIONS_PER_CALL = 200;

/** Backend refuses a new name shorter than 2 characters, and one bad name fails the whole call. */
export function hasValidName(row: ExerciseNameReviewRow, draft: NameReviewDraft, keepName = false): boolean {
  return toDecision(row, draft, keepName).name === null || normalizeName(draft.name).length >= 2;
}

/** Splits already ordered decisions, so pillars land in earlier calls than their variants. */
export function chunkDecisions<T>(decisions: ReadonlyArray<T>, size = NAME_DECISIONS_PER_CALL): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < decisions.length; start += size) {
    chunks.push(decisions.slice(start, start + size));
  }
  return chunks;
}

export function orderDecisions(decisions: ReadonlyArray<ExerciseNameDecisionInput>): ExerciseNameDecisionInput[] {
  return [...decisions].sort((left, right) => Number(right.isPillar) - Number(left.isPillar));
}

export function nextRowId(
  ids: ReadonlyArray<string>,
  currentId: string | null,
  removedIds: ReadonlySet<string> = new Set()
): string | null {
  if (ids.length === 0) return null;
  const index = currentId ? ids.indexOf(currentId) : -1;
  for (let i = index + 1; i < ids.length; i += 1) {
    if (!removedIds.has(ids[i])) return ids[i];
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!removedIds.has(ids[i])) return ids[i];
  }
  return null;
}

const STATUS_VALUES: ReadonlyArray<NameReviewStatusFilter> = ['todo', 'done', 'all'];
const CHANGE_VALUES: ReadonlyArray<NameReviewChangeFilter> = ['all', 'changes', 'same'];

export function parseNameReviewUrl(params: URLSearchParams): NameReviewUrlState {
  const status = params.get('status');
  const change = params.get('change');
  return {
    organizationId: params.get('org') || null,
    status: STATUS_VALUES.includes(status as NameReviewStatusFilter) ? (status as NameReviewStatusFilter) : 'todo',
    pillarsOnly: params.get('pillars') === '1',
    family: params.get('family') || null,
    change: CHANGE_VALUES.includes(change as NameReviewChangeFilter) ? (change as NameReviewChangeFilter) : 'all',
    query: params.get('q') ?? '',
    view: params.get('view') === 'families' ? 'families' : 'list',
    rowId: params.get('row') || null,
  };
}

export function serializeNameReviewUrl(state: NameReviewUrlState): string {
  const params = new URLSearchParams();
  if (state.organizationId) params.set('org', state.organizationId);
  if (state.status !== 'todo') params.set('status', state.status);
  if (state.pillarsOnly) params.set('pillars', '1');
  if (state.family) params.set('family', state.family);
  if (state.change !== 'all') params.set('change', state.change);
  if (state.query.trim()) params.set('q', state.query.trim());
  if (state.view !== 'list') params.set('view', state.view);
  if (state.rowId) params.set('row', state.rowId);
  return params.toString();
}
