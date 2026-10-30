import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useIncrementalList } from './useIncrementalList';

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

describe('useIncrementalList', () => {
  it('pokazuje pierwszą partię i doładowuje kolejne do końca listy', () => {
    const items = range(130);
    const { result } = renderHook(() => useIncrementalList(items, '', 60));

    expect(result.current.visibleItems).toHaveLength(60);
    expect(result.current.remaining).toBe(70);

    act(() => result.current.showMore());
    act(() => result.current.showMore());

    expect(result.current.visibleItems).toHaveLength(130);
    expect(result.current.remaining).toBe(0);
  });

  it('wraca do pierwszej partii przy nowym resetKey, ale nie przy nowych danych', () => {
    const { result, rerender } = renderHook(({ items, resetKey }) => useIncrementalList(items, resetKey, 60), {
      initialProps: { items: range(200), resetKey: '' },
    });

    act(() => result.current.showMore());
    rerender({ items: range(201), resetKey: '' });
    expect(result.current.visibleItems).toHaveLength(120);

    rerender({ items: range(201), resetKey: 'przysiad' });
    expect(result.current.visibleItems).toHaveLength(60);
  });
});
