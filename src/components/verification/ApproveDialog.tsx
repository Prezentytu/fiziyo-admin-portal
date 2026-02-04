"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string | null) => void;
  isLoading?: boolean;
  exerciseName?: string;
}

export function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  exerciseName,
}: ApproveDialogProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes.trim() || null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm p-6"
        data-testid="verification-approve-dialog"
      >
        <VisuallyHidden.Root>
          <DialogTitle>Zatwierdź i Opublikuj</DialogTitle>
          <DialogDescription>
            Potwierdź publikację ćwiczenia do Bazy Globalnej
          </DialogDescription>
        </VisuallyHidden.Root>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-foreground mb-1">
            Zatwierdź i Opublikuj
          </h3>
          <p className="text-sm text-muted-foreground">
            Publikujesz{" "}
            <strong className="text-foreground">
              {exerciseName ? `"${exerciseName}"` : "ćwiczenie"}
            </strong>{" "}
            do Bazy Globalnej.
          </p>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <Textarea
            placeholder="Opcjonalna wiadomość dla autora (np. świetna robota!)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none text-sm"
            data-testid="verification-approve-notes-input"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            data-testid="verification-approve-confirm-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Publikuję...
              </>
            ) : (
              "Opublikuj"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
