import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivatePremiumDialog } from '../ActivatePremiumDialog';

vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const SelectContext = React.createContext<((value: string) => void) | undefined>(undefined);

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) => <SelectContext.Provider value={onValueChange}>{children}</SelectContext.Provider>,
    SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button type="button" onClick={() => onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

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

  it('wymaga powodu przy ustawieniu dokładnej daty wygaśnięcia', async () => {
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

    await user.click(screen.getByText('Ustaw dokładną datę wygaśnięcia'));

    const confirmButton = screen.getByTestId('patient-premium-confirm-dialog-confirm-btn');
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByTestId('patient-premium-target-expiry-input'), '2026-12-31');
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByTestId('patient-premium-reason-textarea'), 'Zmiana planu');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      action: 'SetExactExpiry',
      reason: 'Zmiana planu',
    });
  });

  it('wymaga powodu przy cofnięciu dostępu i wysyła poprawny payload', async () => {
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

    await user.click(screen.getByText('Cofnij dostęp teraz'));

    const confirmButton = screen.getByTestId('patient-premium-confirm-dialog-confirm-btn');
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByTestId('patient-premium-reason-textarea'), 'Koniec współpracy');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      action: 'RevokeNow',
      reason: 'Koniec współpracy',
    });
  });
});

