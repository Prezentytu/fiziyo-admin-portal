import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNameSuggestions } from '../useNameSuggestions';
import { NAME_SUGGESTIONS_DELAY_MS } from '../../utils/nameSuggestions';

const ai = vi.hoisted(() => ({ suggestExerciseVariants: vi.fn() }));
vi.mock('@/services/aiService', () => ({ aiService: ai }));

// 26.11 na żywo: wyszukiwarka pytała o nazwę, a zanim AI odpowiedziało, karta „Utwórz” zapytała drugi raz (2 kredyty).
describe('useNameSuggestions', () => {
  afterEach(() => vi.useRealTimers());

  it('druga karta z tą samą nazwą czeka na zapytanie w toku zamiast płacić drugi raz', async () => {
    vi.useFakeTimers();
    let answer: (variants: { name: string }[]) => void = () => undefined;
    ai.suggestExerciseVariants.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    const search = renderHook(({ text }) => useNameSuggestions(text, true), { initialProps: { text: '' } });
    search.rerender({ text: 'rozciąganie szyi z ręcznikiem' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NAME_SUGGESTIONS_DELAY_MS);
    });
    expect(search.result.current.status).toBe('loading');

    const create = renderHook(() => useNameSuggestions('Rozciąganie szyi z ręcznikiem', true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NAME_SUGGESTIONS_DELAY_MS);
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

  // 26.11 na żywo: przeładowanie rozmowy z trzema kartami tworzenia kosztowało 3 kredyty.
  it('karta otwarta z nazwą nie pyta, dopóki nazwa się nie zmieni', async () => {
    vi.useFakeTimers();
    ai.suggestExerciseVariants.mockClear();
    ai.suggestExerciseVariants.mockResolvedValue([{ name: 'Mostek biodrowy na jednej nodze w leżeniu tyłem' }]);

    const card = renderHook(({ name }) => useNameSuggestions(name, true), {
      initialProps: { name: 'mostek biodrowy na jednej nodze' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NAME_SUGGESTIONS_DELAY_MS);
    });
    expect(ai.suggestExerciseVariants).not.toHaveBeenCalled();
    expect(card.result.current.status).toBe('idle');

    card.rerender({ name: 'mostek biodrowy na jednej nodze z gumą' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NAME_SUGGESTIONS_DELAY_MS);
    });
    expect(ai.suggestExerciseVariants).toHaveBeenCalledTimes(1);
  });
});
