import type { CreateExerciseVariables } from '@/graphql/types/exercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { resolveLoadKg } from '@/utils/exerciseLoadMutation';
import { buildCreateExerciseVariables } from './buildCreateExerciseVariables';

type TagValue = string | { id: string };

/** Pola ćwiczenia źródłowego, które przenosi kopia. Zgodne z odpowiedzią `exerciseById`. */
export interface DuplicateExerciseSource {
  name: string;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
  type?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
  difficultyLevel?: string | null;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
  preparationTime?: number | null;
  defaultExecutionTime?: number | null;
  defaultLoad?: Parameters<typeof resolveLoadKg>[0];
  images?: string[] | null;
  mainTags?: TagValue[] | null;
  additionalTags?: TagValue[] | null;
  /** Dokument treści. Backend zwraca obiekt; tekst JSON też przyjmujemy. */
  enrichmentData?: ExerciseEnrichmentData | string | null;
}

interface BuildDuplicateExerciseVariablesInput {
  organizationId: string;
  source: DuplicateExerciseSource;
  /** Nazwa kopii (np. z `getNextExerciseCopyName`). */
  name: string;
}

function toTagIds(tags: TagValue[] | null | undefined): string[] | null {
  if (!tags || tags.length === 0) return null;
  const ids = tags.map((tag) => (typeof tag === 'string' ? tag : tag.id)).filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids : null;
}

/**
 * „Duplikuj” tworzy rekord gabinetu z treści i mediów źródła. Rekord puli demo ma cudze media z licencją
 * tylko na demo, więc go nie kopiujemy. Bez pola `availability` (API sprzed puli demo) działa jak dotąd;
 * ostateczną bramką jest backend.
 */
export function canDuplicateExercise(exercise: { availability?: string | null } | null | undefined): boolean {
  return exercise?.availability !== 'DEMO';
}

/**
 * Kopia jest nowym rekordem: nie dziedziczy tożsamości źródła (`key`, powtórzenie klucza źródłowego
 * `SourceResearchId`) ani jego statusu weryfikacji (`lifecycle.status`). Reszta dokumentu zostaje.
 */
function withoutSourceIdentity(document: Record<string, unknown>): Record<string, unknown> {
  const { key: _sourceKey, ...copy } = document;
  const lifecycle = copy.lifecycle;
  if (lifecycle != null && typeof lifecycle === 'object' && !Array.isArray(lifecycle)) {
    const { status: _verificationStatus, ...lifecycleCopy } = lifecycle as Record<string, unknown>;
    copy.lifecycle = lifecycleCopy;
  }
  return copy;
}

/**
 * Dokument treści idzie do kopii bez konwersji wersji i bez odsiewania nieznanych kluczy,
 * więc `schemaVersion` i pola, których panel jeszcze nie zna, zostają. Odpada tylko tożsamość
 * źródła (`withoutSourceIdentity`). Pusty albo nieczytelny dokument daje `null`, jak dla ćwiczenia bez treści.
 */
function readEnrichmentDocument(value: DuplicateExerciseSource['enrichmentData']): ExerciseEnrichmentData | null {
  let document: unknown = value;
  if (typeof document === 'string') {
    try {
      document = JSON.parse(document);
    } catch {
      return null;
    }
  }
  if (document == null || typeof document !== 'object' || Array.isArray(document)) return null;
  const copy = withoutSourceIdentity(document as Record<string, unknown>);
  return Object.keys(copy).length > 0 ? (copy as ExerciseEnrichmentData) : null;
}

/** Zmienne `createExercise` dla „Duplikuj”: kolumny i cały dokument treści ćwiczenia źródłowego. */
export function buildDuplicateExerciseVariables({
  organizationId,
  source,
  name,
}: BuildDuplicateExerciseVariablesInput): CreateExerciseVariables {
  return buildCreateExerciseVariables({
    organizationId,
    draft: {
      name,
      patientDescription: source.patientDescription || source.description || '',
      clinicalDescription: source.clinicalDescription,
      notes: source.notes,
      audioCue: source.audioCue,
      tempo: source.tempo,
      rangeOfMotion: source.rangeOfMotion,
      resistance: source.resistance,
      equipment: source.equipment,
      type: source.type,
      side: source.side || source.exerciseSide,
      difficultyLevel: source.difficultyLevel,
      videoUrl: source.videoUrl,
      // GraphQL Exercise ma tylko pola default* (bez sets/restSets/executionTime).
      sets: source.defaultSets ?? null,
      reps: source.defaultReps ?? null,
      duration: source.defaultDuration ?? null,
      restSets: source.defaultRestBetweenSets ?? null,
      restReps: source.defaultRestBetweenReps ?? null,
      preparationTime: source.preparationTime ?? null,
      executionTime: source.defaultExecutionTime ?? null,
      loadKg: resolveLoadKg(source.defaultLoad) ?? null,
      images: source.images?.length ? source.images : null,
      gifUrl: source.gifUrl || null,
      imageUrl: source.imageUrl || null,
      mainTags: toTagIds(source.mainTags),
      additionalTags: toTagIds(source.additionalTags),
      enrichmentData: readEnrichmentDocument(source.enrichmentData),
    },
  });
}
