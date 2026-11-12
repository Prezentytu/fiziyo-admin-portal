import type {
  ExerciseBundleMediaCopy,
  ExerciseBundleMediaCopyItem,
  ExerciseBundleMediaCopyOutcome,
} from '@/graphql/mutations/exercises.mutations';

export type MediaCopyTone = 'success' | 'warning' | 'destructive' | 'secondary';

export interface MediaCopyCount {
  key: 'copied' | 'alreadyPresent' | 'planned' | 'kept' | 'failed';
  label: string;
  count: number;
  tone: MediaCopyTone;
}

export interface MediaCopySummary {
  /** Only non-zero counts, in a fixed order. */
  counts: MediaCopyCount[];
  failedItems: ExerciseBundleMediaCopyItem[];
  totalUrls: number;
}

const COUNT_LABELS: ReadonlyArray<Omit<MediaCopyCount, 'count'>> = [
  { key: 'copied', label: 'skopiowane', tone: 'success' },
  { key: 'alreadyPresent', label: 'już w magazynie', tone: 'success' },
  { key: 'planned', label: 'do skopiowania', tone: 'warning' },
  { key: 'kept', label: 'bez zmian', tone: 'secondary' },
  { key: 'failed', label: 'nieudane', tone: 'destructive' },
];

const OUTCOME_LABELS: Record<ExerciseBundleMediaCopyOutcome, string> = {
  COPIED: 'skopiowane',
  ALREADY_PRESENT: 'już w magazynie',
  PLANNED: 'do skopiowania',
  KEPT_OWN: 'bez zmian, magazyn tego środowiska',
  KEPT_EMBEDDED: 'bez zmian, film osadzany',
  FAILED: 'nieudane, adres bez zmian',
};

export function mediaCopyOutcomeLabel(outcome: ExerciseBundleMediaCopyOutcome): string {
  return OUTCOME_LABELS[outcome] ?? outcome;
}

/** Null when the import did not touch media (no copy for this account or no media addresses in the file). */
export function summarizeMediaCopy(mediaCopy: ExerciseBundleMediaCopy | null | undefined): MediaCopySummary | null {
  if (!mediaCopy || mediaCopy.items.length === 0) {
    return null;
  }

  return {
    counts: COUNT_LABELS.map((entry) => ({ ...entry, count: mediaCopy[entry.key] })).filter((entry) => entry.count > 0),
    failedItems: mediaCopy.items.filter((item) => item.outcome === 'FAILED'),
    totalUrls: mediaCopy.items.length,
  };
}
