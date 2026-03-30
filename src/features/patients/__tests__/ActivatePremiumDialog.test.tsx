import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivatePremiumDialog } from '../ActivatePremiumDialog';

let selectOnValueChange: ((value: string) => void) | undefined;

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    selectOnValueChange = onValueChange;
    return <div>{children}</div>;
  },
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    return (
      <button type="button" onClick={() => selectOnValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

describe('ActivatePremiumDialog', () => {
  it('blokuje potwierdzenie bez wyboru okresu i wysyła wybraną wartość', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ActivatePremiumDialog
        open={true}
        onOpenChange={() => {}}
        patientName="Jan Kowalski"
        currentPremiumValidUntil="2026-04-29T00:00:00.000Z"
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByTestId('patient-premium-confirm-dialog-confirm-btn');
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByTestId('patient-premium-duration-select'));
    await user.click(screen.getByText('1 miesiąc'));

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      action: 'ExtendByDuration',
      durationDays: 30,
    });
  });
});

