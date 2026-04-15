'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';

type NumericParseMode = 'int' | 'float';

interface UseNumericDraftOptions {
  readonly value: number;
  readonly onCommit: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly parseMode?: NumericParseMode;
}

interface UseNumericDraftResult {
  readonly draftValue: string;
  readonly setDraftValue: (value: string) => void;
  readonly increment: () => void;
  readonly decrement: () => void;
  readonly handleBlur: () => void;
  readonly handleFocus: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly canIncrement: boolean;
  readonly canDecrement: boolean;
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

export function useNumericDraft({
  value,
  onCommit,
  min = 0,
  max = MAX_FALLBACK,
  step = 1,
  parseMode = 'int',
}: UseNumericDraftOptions): UseNumericDraftResult {
  const [draftValue, setDraftValue] = useState(() => String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(String(value));
    }
  }, [isEditing, value]);

  const commitDraft = useCallback(() => {
    const parsedNumber = parseNumericValue(draftValue, parseMode);
    if (parsedNumber === null) {
      setDraftValue(String(value));
      return;
    }

    const clampedValue = clampNumber(parsedNumber, min, max);
    if (clampedValue !== value) {
      onCommit(clampedValue);
    }
    setDraftValue(String(clampedValue));
  }, [draftValue, max, min, onCommit, parseMode, value]);

  const increment = useCallback(() => {
    const nextValue = clampNumber(value + step, min, max);
    if (nextValue !== value) {
      onCommit(nextValue);
    }
    setDraftValue(String(nextValue));
  }, [max, min, onCommit, step, value]);

  const decrement = useCallback(() => {
    const nextValue = clampNumber(value - step, min, max);
    if (nextValue !== value) {
      onCommit(nextValue);
    }
    setDraftValue(String(nextValue));
  }, [max, min, onCommit, step, value]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    commitDraft();
  }, [commitDraft]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitDraft();
        event.currentTarget.blur();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftValue(String(value));
        event.currentTarget.blur();
      }
    },
    [commitDraft, value]
  );

  const canIncrement = useMemo(() => value < max, [max, value]);
  const canDecrement = useMemo(() => value > min, [min, value]);

  return {
    draftValue,
    setDraftValue,
    increment,
    decrement,
    handleBlur,
    handleFocus,
    handleKeyDown,
    canIncrement,
    canDecrement,
  };
}
