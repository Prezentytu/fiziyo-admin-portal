'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';

type NumericParseMode = 'int' | 'float';

interface UseOptionalNumericDraftOptions {
  readonly value: number | undefined;
  readonly onCommit: (value: number | undefined) => void;
  readonly min?: number;
  readonly max?: number;
  readonly parseMode?: NumericParseMode;
}

interface UseOptionalNumericDraftResult {
  readonly draftValue: string;
  readonly handleChange: (value: string) => void;
  readonly handleFocus: () => void;
  readonly handleBlur: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const MAX_FALLBACK = Number.MAX_SAFE_INTEGER;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumericValue(rawValue: string, parseMode: NumericParseMode): number | null {
  const normalizedValue = parseMode === 'float' ? rawValue.replace(',', '.') : rawValue;
  if (normalizedValue.trim() === '') return null;

  const parsedNumber =
    parseMode === 'float' ? Number.parseFloat(normalizedValue) : Number.parseInt(normalizedValue, 10);

  if (Number.isNaN(parsedNumber)) return null;

  return parsedNumber;
}

function formatOptionalValue(value: number | undefined): string {
  return value == null ? '' : String(value);
}

export function useOptionalNumericDraft({
  value,
  onCommit,
  min = 0,
  max = MAX_FALLBACK,
  parseMode = 'int',
}: UseOptionalNumericDraftOptions): UseOptionalNumericDraftResult {
  const [draftValue, setDraftValue] = useState(() => formatOptionalValue(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(formatOptionalValue(value));
    }
  }, [isEditing, value]);

  const commitDraft = useCallback(() => {
    const parsedNumber = parseNumericValue(draftValue, parseMode);

    if (parsedNumber === null) {
      if (value !== undefined) {
        onCommit(undefined);
      }
      setDraftValue('');
      return;
    }

    const clampedValue = clampNumber(parsedNumber, min, max);
    if (value !== clampedValue) {
      onCommit(clampedValue);
    }
    setDraftValue(String(clampedValue));
  }, [draftValue, max, min, onCommit, parseMode, value]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleChange = useCallback(
    (nextValue: string) => {
      setDraftValue(nextValue);

      const parsedNumber = parseNumericValue(nextValue, parseMode);
      if (parsedNumber === null) return;

      const clampedValue = clampNumber(parsedNumber, min, max);
      if (value !== clampedValue) {
        onCommit(clampedValue);
      }
    },
    [max, min, onCommit, parseMode, value]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    commitDraft();
  }, [commitDraft]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitDraft();
        event.currentTarget.blur();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftValue(formatOptionalValue(value));
        event.currentTarget.blur();
      }
    },
    [commitDraft, value]
  );

  return {
    draftValue,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
  };
}
