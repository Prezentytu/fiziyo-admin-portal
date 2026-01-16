"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
        className="sm:max-w-md"
        data-testid="verification-approve-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            Certyfikuj ćwiczenie
          </DialogTitle>
          <DialogDescription>
            {exerciseName ? (
              <>
                Zatwierdzasz ćwiczenie <strong>&quot;{exerciseName}&quot;</strong> jako{" "}
                <span className="text-primary font-medium">Złoty Standard FiziYo</span>.
                Będzie widoczne dla wszystkich użytkowników platformy.
              </>
            ) : (
              <>
                Ćwiczenie zostanie opublikowane jako{" "}
                <span className="text-primary font-medium">Złoty Standard FiziYo</span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Optional Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              Notatka dla autora
              <span className="text-xs text-muted-foreground font-normal">(opcjonalna)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Np. 'Świetna jakość!', 'Przydałby się wariant dla początkujących...'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
              data-testid="verification-approve-notes-input"
            />
            <p className="text-xs text-muted-foreground">
              Pochwała lub sugestie dla autora ćwiczenia.
            </p>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Po zatwierdzeniu ćwiczenie:
              </p>
              <ul className="mt-1 text-muted-foreground space-y-0.5">
                <li>• Otrzyma status &quot;Opublikowane&quot;</li>
                <li>• Będzie widoczne w Global Search</li>
                <li>• Zostanie oznaczone jako Public Template</li>
              </ul>
            </div>
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
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
            data-testid="verification-approve-confirm-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Zatwierdzanie...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Certyfikuj
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
