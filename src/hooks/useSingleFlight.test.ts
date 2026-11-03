import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSingleFlight } from './useSingleFlight';

describe('useSingleFlight', () => {
  it('runs the action once while it is in flight and reports pending', async () => {
    let release: (value: string) => void = () => undefined;
    const action = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));
    const { result } = renderHook(() => useSingleFlight(action));

    let first: Promise<string | null> = Promise.resolve(null);
    let second: Promise<string | null> = Promise.resolve(null);
    act(() => {
      first = result.current.run();
      second = result.current.run();
    });
    await expect(second).resolves.toBeNull();
    expect(result.current.pending).toBe(true);

    await act(async () => {
      release('done');
      await first;
    });
    await expect(first).resolves.toBe('done');
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  it('frees the slot after a failure', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useSingleFlight(action));

    await act(async () => {
      await expect(result.current.run()).rejects.toThrow('down');
    });
    await act(async () => {
      await expect(result.current.run()).resolves.toBe('ok');
    });
  });
});
