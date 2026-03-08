interface ExerciseWithDate {
  createdAt?: string | null;
  creationTime?: string | null;
}

function getTimestamp(dateValue?: string | null): number {
  if (!dateValue) {
    return 0;
  }

  const parsedDate = new Date(dateValue).getTime();
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
}

export function sortExercisesByNewest<T extends ExerciseWithDate>(exercises: readonly T[]): T[] {
  return [...exercises].sort((firstExercise, secondExercise) => {
    const firstTimestamp = getTimestamp(firstExercise.createdAt ?? firstExercise.creationTime);
    const secondTimestamp = getTimestamp(secondExercise.createdAt ?? secondExercise.creationTime);
    return secondTimestamp - firstTimestamp;
  });
}
