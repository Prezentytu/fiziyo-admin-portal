function isFillable(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

/**
 * Scala propozycję AI z bieżącą treścią: AI wypełnia tylko puste miejsca, a niepuste wartości
 * fizjoterapeuty zostają. Tablice nie są łączone element po elemencie.
 */
export function deepMergeFillGaps(currentValue: unknown, aiValue: unknown): unknown {
  if (aiValue === undefined || aiValue === null) return currentValue;
  if (isFillable(currentValue)) return aiValue;

  if (Array.isArray(currentValue) || Array.isArray(aiValue)) {
    return currentValue;
  }

  if (typeof currentValue === 'object' && typeof aiValue === 'object' && currentValue && aiValue) {
    const currentRecord = currentValue as Record<string, unknown>;
    const aiRecord = aiValue as Record<string, unknown>;
    const keys = new Set([...Object.keys(currentRecord), ...Object.keys(aiRecord)]);
    const merged: Record<string, unknown> = {};
    for (const key of keys) {
      merged[key] = deepMergeFillGaps(currentRecord[key], aiRecord[key]);
    }
    return merged;
  }

  return currentValue;
}

/**
 * Undo of an AI fill that keeps manual edits: a value still equal to what AI put there goes back
 * to its value from before the fill; anything the therapist changed afterwards stays.
 */
export function revertUnchangedAiValues(current: unknown, before: unknown, after: unknown): unknown {
  if (JSON.stringify(current) === JSON.stringify(after)) return before;
  if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
  const currentFields = current as Record<string, unknown>;
  const beforeFields = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const afterFields = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(currentFields)
      .map(([key, value]) => [key, revertUnchangedAiValues(value, beforeFields[key], afterFields[key])])
      .filter(([, value]) => value !== undefined)
  );
}
