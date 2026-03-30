const COPY_PREFIX = 'Kopia';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function getBaseExerciseName(name: string): string {
  const normalizedName = normalizeWhitespace(name);
  return normalizedName.replace(/^Kopia(?:\s+\d+)?\s+/i, '').trim();
}

export function getNextExerciseCopyName(sourceName: string, existingNames: readonly string[]): string {
  const baseName = getBaseExerciseName(sourceName);
  const escapedBaseName = escapeRegex(baseName);
  const copyNameRegex = new RegExp(`^Kopia(?:\\s+(\\d+))?\\s+${escapedBaseName}$`, 'i');

  const highestExistingCopyNumber = existingNames.reduce((currentHighestNumber, existingName) => {
    const normalizedExistingName = normalizeWhitespace(existingName);
    const match = normalizedExistingName.match(copyNameRegex);

    if (!match) {
      return currentHighestNumber;
    }

    const parsedCopyNumber = match[1] ? Number(match[1]) : 1;
    return Number.isNaN(parsedCopyNumber) ? currentHighestNumber : Math.max(currentHighestNumber, parsedCopyNumber);
  }, 0);

  const nextCopyNumber = highestExistingCopyNumber + 1;
  if (nextCopyNumber === 1) {
    return `${COPY_PREFIX} ${baseName}`;
  }

  return `${COPY_PREFIX} ${nextCopyNumber} ${baseName}`;
}
