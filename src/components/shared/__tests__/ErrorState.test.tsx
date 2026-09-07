import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('calls retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByTestId('page-error-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
