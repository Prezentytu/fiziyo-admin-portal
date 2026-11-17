'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ExerciseOfferDecision } from '@/graphql/types/exerciseOffer.types';

import { decisionCopy, validateDecisionNote, type OfferView } from './utils/exerciseOffers';

export interface PendingDecision {
  offer: OfferView;
  decision: ExerciseOfferDecision;
}

interface ExerciseOfferNoteDialogProps {
  pending: PendingDecision | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (note: string | null) => Promise<void> | void;
}

export function ExerciseOfferNoteDialog({ pending, isSubmitting, onCancel, onConfirm }: ExerciseOfferNoteDialogProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote('');
    setError(null);
  }, [pending?.offer.id, pending?.decision]);

  const handleConfirm = () => {
    if (!pending || isSubmitting) return;
    const validation = validateDecisionNote(pending.decision, note);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    void onConfirm(validation.note);
  };

  const copy = pending ? decisionCopy(pending.decision, pending.offer.mode) : null;

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        data-testid="exercise-offer-note-dialog"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            handleConfirm();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>{pending?.offer.exerciseName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-offer-note">{copy?.noteLabel}</Label>
          <Textarea
            id="exercise-offer-note"
            data-testid="exercise-offer-note-input"
            value={note}
            autoFocus
            rows={4}
            maxLength={2000}
            onChange={(event) => {
              setNote(event.target.value);
              setError(null);
            }}
          />
          {error ? (
            <p className="text-sm text-destructive" data-testid="exercise-offer-note-error">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="exercise-offer-note-cancel-btn"
          >
            Anuluj
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} data-testid="exercise-offer-note-confirm-btn">
            {copy?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
