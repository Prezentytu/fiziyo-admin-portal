import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNameSuggestions } from '../useNameSuggestions';

const ai = vi.hoisted(() => ({ suggestExerciseVariants: vi.fn() }));
vi.mock('@/services/aiService', () => ({ aiService: ai }));

// 26.11 na żywo: wyszukiwarka pytała o nazwę, a zanim AI odpowiedziało, karta „Utwórz” zapytała drugi raz (2 kredyty).
describe('useNameSuggestions', () => {
  afterEach(() => vi.useRealTimers());

  it('druga karta z tą samą nazwą czeka na zapytanie w toku zamiast płacić drugi raz', async () => {
    vi.useFakeTimers();
    let answer: (variants: { name: string }[]) => void = () => undefined;
    ai.suggestExerciseVariants.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    const search = renderHook(() => useNameSuggestions('rozciąganie szyi z ręcznikiem', true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(search.result.current.status).toBe('loading');

    const create = renderHook(() => useNameSuggestions('Rozciąganie szyi z ręcznikiem', true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(ai.suggestExerciseVariants).toHaveBeenCalledTimes(1);

    await act(async () => {
      answer([{ name: 'Rozciąganie mięśni pochyłych szyi w siedzeniu z ręcznikiem' }]);
    });
    expect(create.result.current).toEqual({
      status: 'ready',
      names: ['Rozciąganie mięśni pochyłych szyi w siedzeniu z ręcznikiem'],
    });
    expect(search.result.current.status).toBe('ready');
  });
});
