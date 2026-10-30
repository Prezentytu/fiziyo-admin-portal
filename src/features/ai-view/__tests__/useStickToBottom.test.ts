import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStickToBottom } from '../useStickToBottom';

function scrollArea() {
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: 500, configurable: true });
  element.scrollTo = vi.fn() as unknown as typeof element.scrollTo;
  return element;
}

function scrollUp(element: HTMLDivElement) {
  element.scrollTop = 200;
  element.dispatchEvent(new Event('scroll'));
}

describe('useStickToBottom', () => {
  it('follows new messages at the bottom and stays put when scrolled up', () => {
    const element = scrollArea();
    const scrollRef = { current: element };
    const { result, rerender } = renderHook(({ followKey }) => useStickToBottom(scrollRef, 'a', followKey), {
      initialProps: { followKey: '1' },
    });
    act(() => scrollUp(element));
    vi.mocked(element.scrollTo).mockClear();
    rerender({ followKey: '2' });

    expect(result.current.isAway).toBe(true);
    expect(element.scrollTo).not.toHaveBeenCalled();
  });

  it('opens another conversation at its last message, even after scrolling up in the previous one', () => {
    const element = scrollArea();
    const scrollRef = { current: element };
    const { result, rerender } = renderHook(
      ({ threadKey, followKey }) => useStickToBottom(scrollRef, threadKey, followKey),
      { initialProps: { threadKey: 'a', followKey: '4' } }
    );
    act(() => scrollUp(element));
    vi.mocked(element.scrollTo).mockClear();
    rerender({ threadKey: 'b', followKey: '4' });

    expect(element.scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'auto' });
    expect(result.current.isAway).toBe(false);
  });
});
