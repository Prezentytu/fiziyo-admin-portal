import type { ExerciseRelationType, RelatedExercise } from '@/graphql/types/adminExercise.types';

export type RelatedExerciseGroupKey = 'easier' | 'harder' | 'alternative' | 'similar';

export interface RelatedExerciseLink {
  id: string;
  name: string;
  href: string | null;
  difference: string | null;
  whenToSwitch: string | null;
}

export interface RelatedExerciseGroup {
  key: RelatedExerciseGroupKey;
  title: string;
  items: RelatedExerciseLink[];
}

const GROUP_ORDER: ReadonlyArray<{ key: RelatedExerciseGroupKey; title: string }> = [
  { key: 'easier', title: 'Łatwiej' },
  { key: 'harder', title: 'Trudniej' },
  { key: 'alternative', title: 'Zamiennie' },
  { key: 'similar', title: 'Podobne' },
];

const GROUP_BY_TYPE: Record<ExerciseRelationType, RelatedExerciseGroupKey> = {
  REGRESSION: 'easier',
  PROGRESSION: 'harder',
  ALTERNATIVE: 'alternative',
  SIMILAR: 'similar',
};

function toGroupKey(relationType: string): RelatedExerciseGroupKey {
  return GROUP_BY_TYPE[relationType as ExerciseRelationType] ?? 'similar';
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Relative link so it works on the current domain (DEV and PROD). */
export function buildRelatedExerciseHref(item: Pick<RelatedExercise, 'isTargetAvailable' | 'targetExerciseId'>): string | null {
  if (!item.isTargetAvailable || !item.targetExerciseId) return null;
  return `/exercises/${encodeURIComponent(item.targetExerciseId)}`;
}

/**
 * Groups related exercises into Łatwiej / Trudniej / Zamiennie / Podobne, keeping backend order
 * inside a group and dropping empty groups. Unknown relation types fall into „Podobne”.
 */
export function groupRelatedExercises(items: ReadonlyArray<RelatedExercise>): RelatedExerciseGroup[] {
  const buckets = new Map<RelatedExerciseGroupKey, RelatedExerciseLink[]>();

  for (const item of items) {
    const key = toGroupKey(item.relationType);
    const bucket = buckets.get(key) ?? [];
    bucket.push({
      id: item.id,
      name: cleanText(item.targetName) ?? 'Ćwiczenie niedostępne',
      href: buildRelatedExerciseHref(item),
      difference: cleanText(item.difference),
      whenToSwitch: cleanText(item.whenToSwitch),
    });
    buckets.set(key, bucket);
  }

  return GROUP_ORDER.flatMap(({ key, title }) => {
    const groupItems = buckets.get(key);
    return groupItems?.length ? [{ key, title, items: groupItems }] : [];
  });
}
