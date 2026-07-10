'use client';

import { useCallback } from 'react';
import { Archive } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VerificationArchiveDialogProps {
  open: boolean;
  count: number;
  scopeLabel: string;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function VerificationArchiveDialog({
  open,
  count,
  scopeLabel,
  isLoading = false,
  onOpenChange,
  onConfirm,
}: VerificationArchiveDialogProps) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !isLoading) {
        event.preventDefault();
        void onConfirm();
      }
    },
    [isLoading, onConfirm]
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onKeyDown={handleKeyDown} data-testid="verification-archive-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2" data-testid="verification-archive-dialog-title">
            <Archive className="h-5 w-5 text-destructive" />
            Archiwizować zaznaczone ćwiczenia?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Archiwizujesz {count} {count === 1 ? 'ćwiczenie' : count < 5 ? 'ćwiczenia' : 'ćwiczeń'} w {scopeLabel}.
            Ćwiczenia znikną z aktywnej kolejki, ale pozostaną dostępne w filtrze „Zarchiwizowane”.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-between sm:justify-between sm:space-x-0">
          <AlertDialogCancel disabled={isLoading} data-testid="verification-archive-dialog-cancel-btn">
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              if (!isLoading) {
                void onConfirm();
              }
            }}
            disabled={isLoading || count === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="verification-archive-dialog-confirm-btn"
          >
            {isLoading ? 'Archiwizowanie…' : 'Archiwizuj ćwiczenia'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
