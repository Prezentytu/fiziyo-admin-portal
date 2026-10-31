import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { URL_SEARCH_DEBOUNCE_MS, useUrlSearchInput } from './useUrlSearchInput';

function setup(initialUrlSearch = '') {
  const commit = vi.fn();
  const hook = renderHook(({ urlSearch }) => useUrlSearchInput(urlSearch, commit), {
    initialProps: { urlSearch: initialUrlSearch },
  });
  return { commit, hook };
}

describe('useUrlSearchInput', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('commits typing after a pause, once', () => {
    const { commit, hook } = setup();

    act(() => hook.result.current.setInput('przy'));
    act(() => hook.result.current.setInput('przysiad '));
    act(() => vi.advanceTimersByTime(URL_SEARCH_DEBOUNCE_MS));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('przysiad');
  });

  it('takes the URL value after outside navigation instead of writing the old text back', () => {
    const { commit, hook } = setup('przysiad');

    hook.rerender({ urlSearch: '' });
    act(() => vi.advanceTimersByTime(URL_SEARCH_DEBOUNCE_MS));

    expect(hook.result.current.input).toBe('');
    expect(commit).not.toHaveBeenCalled();
  });

  it('keeps newer typing when its own earlier commit reaches the URL', () => {
    const { commit, hook } = setup();

    act(() => hook.result.current.setInput('hip'));
    act(() => vi.advanceTimersByTime(URL_SEARCH_DEBOUNCE_MS));
    act(() => hook.result.current.setInput('hip thrust'));
    hook.rerender({ urlSearch: 'hip' });

    expect(hook.result.current.input).toBe('hip thrust');
    act(() => vi.advanceTimersByTime(URL_SEARCH_DEBOUNCE_MS));
    expect(commit).toHaveBeenLastCalledWith('hip thrust');
  });

  it('clears the input and the URL at once', () => {
    const { commit, hook } = setup('przysiad');

    act(() => hook.result.current.clear());

    expect(hook.result.current.input).toBe('');
    expect(commit).toHaveBeenCalledWith('');
  });
});
