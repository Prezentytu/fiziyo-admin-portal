import type { BulkArchiveResult } from '@/graphql/types/adminExercise.types';

/**
 * Archiwizuje wiele ćwiczeń, wołając pojedynczą mutację dla każdego z nich.
 * Backend nie ma mutacji zbiorczej, więc wynik liczymy per rekord:
 * sukces to tylko odpowiedź z potwierdzeniem (niepusta wartość); odrzucenie
 * albo brak potwierdzenia to porażka tej pozycji.
 */
export async function runBatchArchive(
  exerciseIds: string[],
  archiveOne: (exerciseId: string) => Promise<unknown>,
  options: { concurrency?: number } = {}
): Promise<BulkArchiveResult> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const outcomes: Array<{ exerciseId: string; error: string | null }> = new Array(exerciseIds.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < exerciseIds.length) {
      const index = nextIndex;
      nextIndex += 1;
      const exerciseId = exerciseIds[index];
      try {
        const confirmation = await archiveOne(exerciseId);
        outcomes[index] = { exerciseId, error: confirmation ? null : 'Brak potwierdzenia archiwizacji' };
      } catch (error) {
        outcomes[index] = { exerciseId, error: error instanceof Error ? error.message : String(error) };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, exerciseIds.length) }, worker));

  const failed = outcomes.filter((outcome) => outcome.error !== null);
  return {
    totalRequested: exerciseIds.length,
    successCount: exerciseIds.length - failed.length,
    failedIds: failed.map((outcome) => outcome.exerciseId),
    errors: failed.map((outcome) => `${outcome.exerciseId}: ${outcome.error}`),
  };
}

export interface BatchArchiveSummary {
  kind: 'success' | 'warning' | 'error';
  message: string;
}

export function formatBatchArchiveSummary(result: BulkArchiveResult): BatchArchiveSummary {
  const failedCount = result.failedIds.length;

  if (failedCount === 0) {
    return { kind: 'success', message: `Zarchiwizowano ${result.successCount} ćwiczeń.` };
  }

  if (result.successCount === 0) {
    return {
      kind: 'error',
      message: `Nie udało się zarchiwizować żadnego z ${result.totalRequested} ćwiczeń.`,
    };
  }

  return {
    kind: 'warning',
    message: `Zarchiwizowano ${result.successCount} z ${result.totalRequested} ćwiczeń. Nie udało się: ${failedCount}. Nieudane pozycje zostały zaznaczone.`,
  };
}
