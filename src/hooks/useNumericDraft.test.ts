import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useNumericDraft } from './useNumericDraft';

describe('useNumericDraft', () => {
  it('commituje wartość dopiero na blur i respektuje clamp', () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState(3);
      const field = useNumericDraft({
        value,
        onCommit: setValue,
        min: 1,
        max: 10,
        parseMode: 'int',
      });

      return { value, field };
    });

    act(() => {
      result.current.field.setDraftValue('');
    });

    expect(result.current.value).toBe(3);
    expect(result.current.field.draftValue).toBe('');

    act(() => {
      result.current.field.setDraftValue('12');
    });

    act(() => {
      result.current.field.handleBlur();
    });

    expect(result.current.value).toBe(10);
    expect(result.current.field.draftValue).toBe('10');
  });

  it('obsługuje float i przecinek w trybie parseMode=float', () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState(4);
      const field = useNumericDraft({
        value,
        onCommit: setValue,
        min: 0,
        max: 24,
        parseMode: 'float',
      });

      return { value, field };
    });

    act(() => {
      result.current.field.setDraftValue('2,5');
    });

    act(() => {
      result.current.field.handleBlur();
    });

    expect(result.current.value).toBe(2.5);
    expect(result.current.field.draftValue).toBe('2.5');
  });
});
