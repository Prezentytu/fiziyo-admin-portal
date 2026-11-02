import type { ExerciseFieldEditConfig } from './fieldContract';

export type NumberFieldDraftResult = { kind: 'value'; value: number | null } | { kind: 'error'; message: string };

/** Typed text of a parameter field → value to save, or why it cannot be saved (out of the field's range). */
export function parseNumberFieldDraft(
  raw: string,
  config: Pick<ExerciseFieldEditConfig, 'min' | 'max' | 'suffix'>
): NumberFieldDraftResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'value', value: null };

  const parsed = Number(trimmed.replace(',', '.'));
  const unit = config.suffix ? ` ${config.suffix}` : '';
  if (!Number.isFinite(parsed)) return { kind: 'error', message: 'Wpisz liczbę' };
  if (config.min !== undefined && parsed < config.min) {
    return { kind: 'error', message: `Najmniej ${config.min}${unit}` };
  }
  if (config.max !== undefined && parsed > config.max) {
    return { kind: 'error', message: `Najwięcej ${config.max}${unit}` };
  }
  return { kind: 'value', value: parsed };
}
