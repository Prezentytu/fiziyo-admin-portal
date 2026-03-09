export interface QueueProgressModel {
  summary: string;
  details: string;
  progressPercent: number;
}

function formatExerciseNoun(count: number): string {
  if (count === 1) return 'ćwiczenie';
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return 'ćwiczenia';
  }
  return 'ćwiczeń';
}

export function buildQueueProgressModel(
  positionInQueue: number | null,
  totalPending: number,
  remainingCount: number
): QueueProgressModel | null {
  if (!positionInQueue || totalPending <= 0) {
    return null;
  }

  const progressPercent = (positionInQueue / totalPending) * 100;
  const safeRemainingCount = Math.max(remainingCount, 0);
  const summary = `Ćwiczenie ${positionInQueue} z ${totalPending} do weryfikacji`;
  const details =
    safeRemainingCount > 0
      ? `Po decyzji zostanie ${safeRemainingCount} ${formatExerciseNoun(safeRemainingCount)}`
      : 'To ostatnie ćwiczenie w kolejce';

  return {
    summary,
    details,
    progressPercent,
  };
}
