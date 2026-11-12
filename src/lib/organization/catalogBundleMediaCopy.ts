export type MediaCopyTone = 'success' | 'warning' | 'destructive' | 'secondary';

/** Wynik znany portalowi albo dowolna nowa wartość z API (pokazywana wprost). */
export type ExerciseBundleMediaCopyOutcome = string;

export interface ExerciseBundleMediaCopyItem {
  sourceUrl: string;
  targetUrl: string | null;
  outcome: ExerciseBundleMediaCopyOutcome;
  reason: string | null;
}

/** Copy of bundle media into this environment's storage, done before the import writes records. */
export interface ExerciseBundleMediaCopy {
  copied: number;
  alreadyPresent: number;
  planned: number;
  kept: number;
  failed: number;
  /** Odłożone przez limit jednego żądania; pozycje z takim adresem nie są zapisane, plik trzeba wysłać ponownie. */
  deferred: number;
  /** Nie kopiowane, bo pozycja z tym adresem została odrzucona. */
  notCopied: number;
  items: ExerciseBundleMediaCopyItem[];
}

export interface MediaCopyCount {
  key: 'copied' | 'alreadyPresent' | 'planned' | 'kept' | 'deferred' | 'notCopied' | 'failed';
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
  { key: 'deferred', label: 'odłożone', tone: 'warning' },
  { key: 'notCopied', label: 'niekopiowane', tone: 'secondary' },
  { key: 'failed', label: 'nieudane', tone: 'destructive' },
];

const OUTCOME_LABELS: Record<string, string> = {
  COPIED: 'skopiowane',
  ALREADY_PRESENT: 'już w magazynie',
  PLANNED: 'do skopiowania',
  KEPT_OWN: 'bez zmian, magazyn tego środowiska',
  KEPT_EMBEDDED: 'bez zmian, film osadzany',
  FAILED: 'nieudane, adres bez zmian',
  DEFERRED: 'odłożone (limit jednego żądania), pozycji nie zapisano; wyślij plik ponownie',
  NOT_COPIED: 'nie skopiowano, pozycji z tym adresem nie zapisano',
};

/** Licznik, do którego wpada wynik adresu, gdy API nie podało liczników; nieznany wynik nie wpada do żadnego. */
const COUNT_KEY_BY_OUTCOME: Record<string, MediaCopyCount['key']> = {
  COPIED: 'copied',
  ALREADY_PRESENT: 'alreadyPresent',
  PLANNED: 'planned',
  KEPT_OWN: 'kept',
  KEPT_EMBEDDED: 'kept',
  FAILED: 'failed',
  DEFERRED: 'deferred',
  NOT_COPIED: 'notCopied',
};

export function mediaCopyOutcomeLabel(outcome: ExerciseBundleMediaCopyOutcome): string {
  return Object.hasOwn(OUTCOME_LABELS, outcome) ? OUTCOME_LABELS[outcome] : outcome;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readItem(value: unknown): ExerciseBundleMediaCopyItem | null {
  if (!isRecord(value)) return null;
  const sourceUrl = textOrNull(value.sourceUrl);
  const outcome = textOrNull(value.outcome);
  if (!sourceUrl || !outcome) return null;
  return { sourceUrl, targetUrl: textOrNull(value.targetUrl), outcome, reason: textOrNull(value.reason) };
}

/**
 * Raport kopii mediów z odpowiedzi importu. Czyta tylko pola, które zna: brak raportu (API sprzed fizjo-app#432),
 * brak licznika albo listy, nieznany wynik i dodatkowe pola nie psują karty importu. Brakujący licznik liczy z listy.
 */
export function readMediaCopy(value: unknown): ExerciseBundleMediaCopy | null {
  if (!isRecord(value)) return null;

  const items = (Array.isArray(value.items) ? value.items : [])
    .map(readItem)
    .filter((item): item is ExerciseBundleMediaCopyItem => item !== null);

  const count = (key: MediaCopyCount['key']): number => {
    const reported = value[key];
    if (typeof reported === 'number' && Number.isFinite(reported) && reported >= 0) return reported;
    return items.filter((item) => COUNT_KEY_BY_OUTCOME[item.outcome] === key).length;
  };

  return {
    copied: count('copied'),
    alreadyPresent: count('alreadyPresent'),
    planned: count('planned'),
    kept: count('kept'),
    deferred: count('deferred'),
    notCopied: count('notCopied'),
    failed: count('failed'),
    items,
  };
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
