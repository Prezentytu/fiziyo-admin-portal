/** Backend zwraca najwyżej tyle wpisów historii (`AICreditsService.GetCreditsHistory`, `Take(100)`). */
export const CREDITS_HISTORY_LIMIT = 100;

/** `actionType` wpisów `usage` z backendu; nieznany trafia do „Inne”. */
const FEATURE_LABELS: Readonly<Record<string, string>> = {
  chat: 'Czat',
  visit_draft: 'Zalecenia z wizyty',
  exercise_suggest: 'Propozycje ćwiczeń',
  set_generate: 'Zestawy z AI',
  set_name_suggest: 'Nazwy zestawów',
  exercise_variants: 'Warianty ćwiczeń',
  enrichment_generate: 'Opisy ćwiczeń',
  image_generate: 'Obrazy ćwiczeń',
  clinical_notes: 'Notatki kliniczne',
  voice_parse: 'Polecenia głosowe',
  document_import: 'Import dokumentów',
  patient_dictation: 'Dyktowanie notatek pacjenta',
};

const OTHER_KEY = 'other';

export interface CreditsLogEntry {
  readonly kind: string;
  readonly actionType: string;
  readonly creditsUsed: number;
}

export interface CreditsFeatureUsage {
  readonly key: string;
  readonly label: string;
  readonly credits: number;
}

export interface CreditsUsageSummary {
  readonly byFeature: readonly CreditsFeatureUsage[];
  /** Kredyty oddane za nieudane albo przerwane wywołania. */
  readonly refunded: number;
  /** Historia doszła do limitu backendu, więc podział nie obejmuje starszych wpisów. */
  readonly truncated: boolean;
}

export function summarizeCreditsUsage(logs: readonly CreditsLogEntry[]): CreditsUsageSummary {
  const totals = new Map<string, number>();
  let refunded = 0;

  for (const log of logs) {
    if (log.kind === 'refund') {
      refunded += log.creditsUsed;
      continue;
    }
    if (log.kind !== 'usage') continue;
    const key = Object.hasOwn(FEATURE_LABELS, log.actionType) ? log.actionType : OTHER_KEY;
    totals.set(key, (totals.get(key) ?? 0) + log.creditsUsed);
  }

  const byFeature = [...totals]
    .map(([key, credits]) => ({ key, label: FEATURE_LABELS[key] ?? 'Inne', credits }))
    .sort((a, b) => b.credits - a.credits);

  return { byFeature, refunded, truncated: logs.length >= CREDITS_HISTORY_LIMIT };
}
