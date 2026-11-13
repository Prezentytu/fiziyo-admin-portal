/**
 * Przeciwwskazania rekordu 3.3 jako lista tekstów dla etapu Bezpieczeństwo. Sam zapis dokumentu 3.3 żyje we
 * wspólnym module `@/components/shared/exercise/writeExerciseContent` (formularz i weryfikacja).
 */
import type { EnrichmentContraindicationV33, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), source);
}

export function readContraindicationTextsV33(enrichment: ExerciseEnrichmentData): string[] {
  const items: unknown = getAtPath(enrichment, 'safety.contraindications');
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (isRecord(item) ? item.text : item))
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
}

/** Contraindications in their v3.3 shape; an entry whose text stays keeps its other keys. */
export function writeContraindicationsV33(
  enrichment: ExerciseEnrichmentData,
  texts: string[]
): EnrichmentContraindicationV33[] {
  const existing: unknown = getAtPath(enrichment, 'safety.contraindications');
  const byText = new Map<string, EnrichmentContraindicationV33>();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (isRecord(item) && typeof item.text === 'string') byText.set(item.text, item as EnrichmentContraindicationV33);
  }
  return texts.map((text) => byText.get(text) ?? { text });
}
