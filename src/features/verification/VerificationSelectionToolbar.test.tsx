import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VerificationSelectionToolbar } from './VerificationSelectionToolbar';

describe('VerificationSelectionToolbar', () => {
  it('does not render without a selection', () => {
    const { container } = render(
      <VerificationSelectionToolbar
        selectedCount={0}
        visibleCount={2}
        allVisibleSelected={false}
        someVisibleSelected={false}
        onToggleVisible={vi.fn()}
        onClear={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('exposes the selected count and archive action', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();

    render(
      <VerificationSelectionToolbar
        selectedCount={2}
        visibleCount={2}
        allVisibleSelected={true}
        someVisibleSelected={false}
        onToggleVisible={vi.fn()}
        onClear={vi.fn()}
        onArchive={onArchive}
      />
    );

    expect(screen.getByTestId('verification-selection-count')).toHaveTextContent('Zaznaczono: 2');
    await user.click(screen.getByTestId('verification-selection-archive-btn'));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});
