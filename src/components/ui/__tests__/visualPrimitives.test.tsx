import React from 'react';
import Link from 'next/link';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../button';
import { Card, CardTitle } from '../card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';

afterEach(cleanup);

describe('visual primitives', () => {
  it('preserves button refs, disabled behavior, and wrapping without fixed text height', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();
    const { rerender } = render(
      <Button data-testid="test-save" ref={ref} onClick={onClick}>
        Save plan
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Save plan' });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass('whitespace-normal', 'min-h-10', 'focus-visible:ring-2');
    expect(button).not.toHaveClass('h-9', 'whitespace-nowrap');
    await user.click(button);
    rerender(
      <Button data-testid="test-save" ref={ref} onClick={onClick} disabled>
        Save plan
      </Button>
    );
    await user.click(button);
    expect(button).toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves asChild semantics and fixed icon dimensions', () => {
    render(
      <>
        <Button data-testid="test-back" asChild variant="outline">
          <Link href="/patients">Patients</Link>
        </Button>
        <Button data-testid="test-icon" size="icon" aria-label="Add">
          +
        </Button>
        <Card data-testid="test-card">
          <CardTitle>Plan</CardTitle>
        </Card>
      </>
    );
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', '/patients');
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('size-10', 'shrink-0');
    expect(screen.getByTestId('test-card')).toHaveClass('rounded-sm', 'bg-card', 'text-card-foreground');
    expect(screen.getByTestId('test-card').className).not.toContain('shadow');
    expect(screen.getByRole('heading', { name: 'Plan' })).toHaveClass('tracking-normal', 'leading-snug');
  });
});

describe('dialog foundations', () => {
  it('retains accessible names, Escape closing, and trigger focus restoration', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger data-testid="test-open">Edit plan</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan</DialogTitle>
            <DialogDescription>Plan details</DialogDescription>
          </DialogHeader>
          <DialogFooter data-testid="test-footer">
            <DialogClose data-testid="test-cancel" asChild>
              <Button data-testid="test-cancel" variant="outline">Cancel</Button>
            </DialogClose>
            <Button data-testid="test-confirm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    const trigger = screen.getByTestId('test-open');
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Plan' });
    expect(dialog).toHaveAccessibleDescription('Plan details');
    expect(dialog).toHaveClass('w-[calc(100%-2rem)]', 'max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
    expect(screen.getByTestId('common-dialog-close')).toHaveAccessibleName('Zamknij');
    expect(screen.getByTestId('test-footer')).toHaveClass('sm:justify-between', 'sm:flex-wrap', 'gap-2');
    expect(screen.getByTestId('test-footer').firstElementChild).toBe(screen.getByTestId('test-cancel'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('preserves specialized scroll, sizing and Escape interception', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn((event: KeyboardEvent) => event.preventDefault());
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          className="flex flex-col p-0 gap-0 overflow-hidden w-[98vw] max-w-7xl max-h-[95vh]"
          onEscapeKeyDown={onEscape}
        >
          <DialogTitle>Wizard</DialogTitle>
          <DialogDescription>Plan setup</DialogDescription>
          <div data-testid="test-scroll" className="min-h-0 flex-1 overflow-y-auto">
            Content
          </div>
        </DialogContent>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog', { name: 'Wizard' });
    expect(dialog).toHaveClass('flex', 'flex-col', 'p-0', 'gap-0', 'overflow-hidden', 'w-[98vw]', 'max-h-[95vh]');
    expect(dialog).not.toHaveClass('grid', 'overflow-y-auto', 'p-6', 'w-[calc(100%-2rem)]');
    expect(screen.queryByTestId('common-dialog-close')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-scroll')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
