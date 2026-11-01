import { describe, expect, it, vi } from 'vitest';

import { formatBatchArchiveSummary, runBatchArchive } from '../batchArchive';

describe('runBatchArchive', () => {
  it('wywołuje pojedynczą archiwizację dla każdego ćwiczenia i zlicza sukcesy', async () => {
    const archiveOne = vi.fn(async (exerciseId: string) => ({ id: exerciseId }));

    const result = await runBatchArchive(['ex-1', 'ex-2', 'ex-3'], archiveOne);

    expect(archiveOne).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ totalRequested: 3, successCount: 3, failedIds: [], errors: [] });
  });

  it('raportuje częściowy sukces, gdy część mutacji odrzuca albo nie zwraca potwierdzenia', async () => {
    const archiveOne = vi.fn(async (exerciseId: string) => {
      if (exerciseId === 'ex-2') {
        throw new Error('Archiwizować można tylko ćwiczenie ze statusem OrgVerified.');
      }
      if (exerciseId === 'ex-3') {
        return null;
      }
      return { id: exerciseId };
    });

    const result = await runBatchArchive(['ex-1', 'ex-2', 'ex-3'], archiveOne);

    expect(result.totalRequested).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.failedIds).toEqual(['ex-2', 'ex-3']);
    expect(result.errors).toEqual([
      'ex-2: Archiwizować można tylko ćwiczenie ze statusem OrgVerified.',
      'ex-3: Brak potwierdzenia archiwizacji',
    ]);
  });

  it('nie zgłasza sukcesu, gdy wszystkie pozycje padły', async () => {
    const result = await runBatchArchive(['ex-1', 'ex-2'], async () => {
      throw new Error('Network error');
    });

    expect(result.successCount).toBe(0);
    expect(result.failedIds).toEqual(['ex-1', 'ex-2']);
    expect(formatBatchArchiveSummary(result)).toEqual({
      kind: 'error',
      message: 'Nie udało się zarchiwizować żadnego z 2 ćwiczeń.',
    });
  });

  it('ogranicza liczbę równoległych wywołań', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const archiveOne = async (exerciseId: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return { id: exerciseId };
    };

    const ids = Array.from({ length: 12 }, (_, index) => `ex-${index}`);
    const result = await runBatchArchive(ids, archiveOne, { concurrency: 3 });

    expect(result.successCount).toBe(12);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});

describe('formatBatchArchiveSummary', () => {
  it('zwraca sukces, gdy wszystkie pozycje się udały', () => {
    expect(formatBatchArchiveSummary({ totalRequested: 2, successCount: 2, failedIds: [], errors: [] })).toEqual({
      kind: 'success',
      message: 'Zarchiwizowano 2 ćwiczeń.',
    });
  });

  it('zwraca ostrzeżenie z liczbą udanych i nieudanych przy częściowym sukcesie', () => {
    expect(
      formatBatchArchiveSummary({ totalRequested: 3, successCount: 1, failedIds: ['a', 'b'], errors: [] })
    ).toEqual({
      kind: 'warning',
      message: 'Zarchiwizowano 1 z 3 ćwiczeń. Nie udało się: 2. Nieudane pozycje zostały zaznaczone.',
    });
  });
});
