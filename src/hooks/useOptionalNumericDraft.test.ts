import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useOptionalNumericDraft } from './useOptionalNumericDraft';

describe('useOptionalNumericDraft', () => {
  it('po wyczyszczeniu pola commituje undefined dopiero na blur', () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState<number | undefined>(50);
      const field = useOptionalNumericDraft({
        value,
        onCommit: setValue,
        min: 0,
        max: 300,
      });

      return { value, field };
    });

    act(() => {
      result.current.field.handleChange('');
    });

    expect(result.current.value).toBe(50);
    expect(result.current.field.draftValue).toBe('');

    act(() => {
      result.current.field.handleBlur();
    });

    expect(result.current.value).toBeUndefined();
    expect(result.current.field.draftValue).toBe('');
  });

  it('commituje liczbe juz na change i respektuje clamp', () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState<number | undefined>(10);
      const field = useOptionalNumericDraft({
        value,
        onCommit: setValue,
        min: 0,
        max: 60,
      });

      return { value, field };
    });

    act(() => {
      result.current.field.handleChange('80');
    });

    expect(result.current.value).toBe(60);

    act(() => {
      result.current.field.handleBlur();
    });

    expect(result.current.value).toBe(60);
    expect(result.current.field.draftValue).toBe('60');
  });
});
