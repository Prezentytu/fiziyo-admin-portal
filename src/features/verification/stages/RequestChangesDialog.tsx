'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface RequestChangesDialogProps {
  open: boolean;
  initialNotes: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
}

/** Organization track: sends the exercise back to its author with a required note. */
export function RequestChangesDialog({
  open,
  initialNotes,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: RequestChangesDialogProps) {
  const [notes, setNotes] = useState(initialNotes);
  const trimmed = notes.trim();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setNotes(initialNotes);
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (trimmed && !isSubmitting) onConfirm(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown} data-testid="org-verification-changes-dialog">
        <DialogHeader>
          <DialogTitle>Odeślij do poprawek</DialogTitle>
          <DialogDescription>
            Autor zobaczy tę notatkę przy ćwiczeniu. Napisz, co dokładnie poprawić, żeby nie musiał zgadywać.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={5}
          value={notes}
          aria-label="Co poprawić"
          placeholder="Np. zdjęcie 2 pokazuje inną pozycję niż krok 2"
          onChange={(event) => setNotes(event.target.value)}
          data-testid="org-verification-changes-notes-input"
        />
        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            data-testid="org-verification-changes-cancel-btn"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!trimmed || isSubmitting}
            data-testid="org-verification-changes-confirm-btn"
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            Odeślij autorowi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
