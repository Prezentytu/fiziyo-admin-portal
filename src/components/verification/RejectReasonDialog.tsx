"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { RejectionReason } from "@/graphql/types/adminExercise.types";

interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RejectionReason, notes: string) => void;
  isLoading?: boolean;
  exerciseName?: string;
}

const REJECTION_REASONS: { value: RejectionReason; label: string; hint: string }[] = [
  {
    value: "POOR_MEDIA_QUALITY",
    label: "Zła jakość wideo/obrazu",
    hint: "Niewyraźne, ciemne lub nieprofesjonalne media",
  },
  {
    value: "CLINICAL_ERROR",
    label: "Błąd merytoryczny w technice",
    hint: "Nieprawidłowa technika wykonania lub niebezpieczne zalecenia",
  },
  {
    value: "INCOMPLETE_DESCRIPTION",
    label: "Niekompletny opis",
    hint: "Brak instrukcji, zbyt krótki lub niejasny opis",
  },
  {
    value: "INCORRECT_TAGS",
    label: "Nieodpowiednie tagi",
    hint: "Błędna kategoryzacja lub brakujące tagi",
  },
  {
    value: "POTENTIAL_DUPLICATE",
    label: "Potencjalny duplikat",
    hint: "Ćwiczenie już istnieje w bazie",
  },
  {
    value: "OTHER",
    label: "Inne (wyjaśnij w notatce)",
    hint: "Inny powód - szczegóły w notatce",
  },
];

export function RejectReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  exerciseName,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState<RejectionReason | "">("");
  const [notes, setNotes] = useState("");

  const selectedReason = REJECTION_REASONS.find((r) => r.value === reason);
  const isValid = reason && notes.trim().length >= 10;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(reason as RejectionReason, notes.trim());
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="verification-reject-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Odrzuć ćwiczenie
          </DialogTitle>
          <DialogDescription>
            {exerciseName ? (
              <>
                Odrzucasz ćwiczenie <strong>&quot;{exerciseName}&quot;</strong>. Podaj powód
                odrzucenia i szczegółowe uwagi dla autora.
              </>
            ) : (
              "Podaj powód odrzucenia i szczegółowe uwagi dla autora."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Select */}
          <div className="space-y-2">
            <Label htmlFor="reason">Powód odrzucenia *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as RejectionReason)}
            >
              <SelectTrigger
                id="reason"
                data-testid="verification-reject-reason-select"
              >
                <SelectValue placeholder="Wybierz powód..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="text-xs text-muted-foreground">{selectedReason.hint}</p>
            )}
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Szczegółowe uwagi * <span className="text-muted-foreground">(min. 10 znaków)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Opisz szczegółowo co wymaga poprawy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="verification-reject-notes-input"
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length} znaków
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            data-testid="verification-reject-confirm-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Odrzucanie...
              </>
            ) : (
              "Odrzuć z uwagami"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
