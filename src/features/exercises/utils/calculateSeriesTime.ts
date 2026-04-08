interface CalculateSeriesTimeInput {
  duration?: number | null;
  reps?: number | null;
  executionTime?: number | null;
  restReps?: number | null;
}

export function calculateSeriesTimeSeconds({
  duration,
  reps,
  executionTime,
  restReps,
}: CalculateSeriesTimeInput): number | null {
  if (duration != null && duration > 0) {
    return duration;
  }

  if (reps == null || reps <= 0 || executionTime == null || executionTime <= 0) {
    return null;
  }

  const repExecutionTime = reps * executionTime;
  const breaksBetweenReps = Math.max(0, reps - 1);
  const microRestTime = breaksBetweenReps * Math.max(0, restReps ?? 0);

  return repExecutionTime + microRestTime;
}
