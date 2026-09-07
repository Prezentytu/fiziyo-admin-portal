import { useRef, useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../dialog';

afterEach(cleanup);

function ControlledDialog({
  customReturn = false,
  autoFocus = false,
}: {
  customReturn?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nextAction = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button data-testid="test-dialog-open-first" onClick={() => setOpen(true)}>
        Pierwsza akcja
      </button>
      <button data-testid="test-dialog-open-second" onClick={() => setOpen(true)}>
        Druga akcja
      </button>
      <button data-testid="test-dialog-next-action" ref={nextAction}>
        Następna akcja
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={
            customReturn
              ? (event) => {
                  event.preventDefault();
                  nextAction.current?.focus();
                }
              : undefined
          }
        >
          <DialogTitle>Kontrolowany dialog</DialogTitle>
          <input data-testid="test-dialog-field" aria-label="Pole formularza" autoFocus={autoFocus} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function NestedDialogs() {
  const [innerOpen, setInnerOpen] = useState(false);
  return (
    <Dialog>
      <DialogTrigger data-testid="test-dialog-outer-trigger">Otwórz zewnętrzny</DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Zewnętrzny dialog</DialogTitle>
        <button data-testid="test-dialog-inner-trigger" onClick={() => setInnerOpen(true)}>
          Otwórz wewnętrzny
        </button>
        <Dialog open={innerOpen} onOpenChange={setInnerOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Wewnętrzny dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog focus return', () => {
  it('restores the actual opener for controlled dialogs without DialogTrigger on each opening', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    for (const testId of ['test-dialog-open-first', 'test-dialog-open-second']) {
      const opener = screen.getByTestId(testId);
      await user.click(opener);
      expect(screen.getByRole('dialog', { name: 'Kontrolowany dialog' })).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(opener).toHaveFocus());
    }
  });

  it('captures the opener before a form field receives native autoFocus', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog autoFocus />);
    const opener = screen.getByTestId('test-dialog-open-first');
    await user.click(opener);
    expect(screen.getByRole('textbox', { name: 'Pole formularza' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('preserves explicit consumer focus handling', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog customReturn />);
    await user.click(screen.getByTestId('test-dialog-open-first'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByTestId('test-dialog-next-action')).toHaveFocus());
  });

  it('returns focus to the parent dialog before restoring its standard trigger', async () => {
    const user = userEvent.setup();
    render(<NestedDialogs />);
    const outerTrigger = screen.getByTestId('test-dialog-outer-trigger');
    await user.click(outerTrigger);
    const innerTrigger = screen.getByTestId('test-dialog-inner-trigger');
    await user.click(innerTrigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(innerTrigger).toHaveFocus());
    expect(screen.getByRole('dialog', { name: 'Zewnętrzny dialog' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(outerTrigger).toHaveFocus());
  });
});
