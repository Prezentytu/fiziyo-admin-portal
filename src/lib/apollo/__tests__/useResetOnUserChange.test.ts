import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useResetOnUserChange } from '../useResetOnUserChange';

type Props = { userId: string | null | undefined; isLoaded: boolean };

function setup(initial: Props) {
  const onUserChange = vi.fn();
  const view = renderHook((props: Props) => useResetOnUserChange({ ...props, onUserChange }), {
    initialProps: initial,
  });
  return { onUserChange, rerender: view.rerender };
}

describe('useResetOnUserChange', () => {
  it('does not reset on the first load of a signed-in tab', () => {
    const { onUserChange, rerender } = setup({ userId: undefined, isLoaded: false });
    rerender({ userId: 'user_a', isLoaded: true });
    rerender({ userId: 'user_a', isLoaded: true });

    expect(onUserChange).not.toHaveBeenCalled();
  });

  it('resets when the user signs out, also from another tab', () => {
    const { onUserChange, rerender } = setup({ userId: 'user_a', isLoaded: true });
    rerender({ userId: null, isLoaded: true });

    expect(onUserChange).toHaveBeenCalledExactlyOnceWith('user_a');
  });

  it('resets when another account signs in in the same tab', () => {
    const { onUserChange, rerender } = setup({ userId: 'user_a', isLoaded: true });
    rerender({ userId: 'user_b', isLoaded: true });

    expect(onUserChange).toHaveBeenCalledExactlyOnceWith('user_a');
  });

  it('resets when a user signs in after a signed-out start', () => {
    const { onUserChange, rerender } = setup({ userId: null, isLoaded: true });
    rerender({ userId: 'user_b', isLoaded: true });

    expect(onUserChange).toHaveBeenCalledExactlyOnceWith(null);
  });
});
