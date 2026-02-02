"use client";

import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Video,
  AlertCircle,
  Copy,
  Ban,
  HelpCircle,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RejectionReason } from "@/graphql/types/adminExercise.types";

interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RejectionReason, notes: string) => void;
  isLoading?: boolean;
  exerciseName?: string;
}

const REJECTION_REASONS: {
  value: RejectionReason;
  label: string;
  hint: string;
  icon: React.ReactNode;
  suggestedNote: string;
}[] = [
  {
    value: "POOR_MEDIA_QUALITY",
    label: "Zła jakość wideo / Złe kadrowanie",
    hint: "Niewyraźne, ciemne lub nieprofesjonalne media",
    icon: <Video className="h-4 w-4" />,
    suggestedNote:
      "Dziękujemy za przesłanie ćwiczenia! Niestety jakość wideo wymaga poprawy. Proszę upewnić się, że:\n- Nagranie jest ostre i dobrze oświetlone\n- Cały ruch jest widoczny w kadrze\n- Tło jest neutralne i nie rozprasza uwagi\n\nZachęcamy do ponownego przesłania po wprowadzeniu poprawek.",
  },
  {
    value: "CLINICAL_ERROR",
    label: "Błąd merytoryczny / Niebezpieczne wykonanie",
    hint: "Nieprawidłowa technika wykonania lub ryzyko kontuzji",
    icon: <AlertCircle className="h-4 w-4" />,
    suggestedNote:
      "Dziękujemy za przesłanie ćwiczenia. Nasz zespół ekspertów zauważył problemy z techniką wykonania, które mogą prowadzić do kontuzji lub nie przynosić zamierzonych efektów.\n\nProsimy o konsultację z fizjoterapeutą i ewentualną korektę techniki przed ponownym przesłaniem.",
  },
  {
    value: "POTENTIAL_DUPLICATE",
    label: "Duplikat (To ćwiczenie już mamy)",
    hint: "Ćwiczenie już istnieje w bazie pod inną nazwą",
    icon: <Copy className="h-4 w-4" />,
    suggestedNote:
      "Dziękujemy za przesłanie! To ćwiczenie już znajduje się w naszej bazie. Jeśli uważasz, że Twoja wersja wnosi coś nowego (np. inny wariant lub modyfikację), prosimy o dodanie opisu wyróżniającego tę wersję od istniejącej.",
  },
  {
    value: "OTHER",
    label: "Naruszenie zasad / Inne",
    hint: "Np. logo konkurencji w tle, nieodpowiednia treść",
    icon: <Ban className="h-4 w-4" />,
    suggestedNote:
      "Dziękujemy za przesłanie ćwiczenia. Niestety nie możemy go zaakceptować z powodu naruszenia naszych zasad publikacji. Szczegóły poniżej:\n\n[TUTAJ OPISZ KONKRETNY PROBLEM]\n\nZachęcamy do ponownego przesłania po wprowadzeniu poprawek.",
  },
];

// AI suggested notes templates based on reason
const AI_NOTE_TEMPLATES: Record<RejectionReason, string[]> = {
  POOR_MEDIA_QUALITY: [
    "Proszę poprawić kadrowanie - ucięta głowa/stopy.",
    "Wideo jest zbyt ciemne. Proszę nagrać w lepszym oświetleniu.",
    "Nagranie jest nieostre. Proszę użyć statywu lub stabilizacji.",
  ],
  CLINICAL_ERROR: [
    "Lordoza lędźwiowa nie jest zachowana podczas ruchu.",
    "Zbyt duży zakres ruchu - ryzyko przeciążenia stawu.",
    "Proszę zwrócić uwagę na pozycję kolan względem stóp.",
  ],
  INCOMPLETE_DESCRIPTION: [
    "Brak informacji o pozycji wyjściowej.",
    "Opis nie zawiera informacji o oddychaniu.",
    "Proszę dodać informacje o liczbie powtórzeń/serii.",
  ],
  INCORRECT_TAGS: [
    "Tagi nie odpowiadają grupom mięśniowym aktywowanym w ćwiczeniu.",
    "Proszę dodać tag określający poziom trudności.",
    "Brak tagu kategorii (np. rozciąganie, wzmacnianie).",
  ],
  POTENTIAL_DUPLICATE: [
    "To ćwiczenie jest wariantem istniejącego [NAZWA]. Rozważ dodanie jako wariant.",
    "Identyczne ćwiczenie znajduje się w bazie. Sprawdź przed ponownym przesłaniem.",
  ],
  OTHER: [
    "Widoczne logo/marka w tle - proszę usunąć lub zakryć.",
    "Nieodpowiedni strój do demonstracji ćwiczenia.",
    "Proszę usunąć elementy rozpraszające z tła.",
  ],
};

export function RejectReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  exerciseName,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState<RejectionReason | "">("");
  const [notes, setNotes] = useState("");
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

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

  const handleReasonChange = (value: string) => {
    setReason(value as RejectionReason);
    // Auto-fill suggested note when reason changes
    const selected = REJECTION_REASONS.find((r) => r.value === value);
    if (selected && !notes.trim()) {
      setNotes(selected.suggestedNote);
    }
  };

  const handleGenerateNote = useCallback(async () => {
    if (!reason) {
      toast.error("Najpierw wybierz powód odrzucenia");
      return;
    }

    setIsGeneratingNote(true);
    try {
      // Symulacja - w przyszłości można podpiąć prawdziwe AI
      await new Promise((resolve) => setTimeout(resolve, 500));

      const templates = AI_NOTE_TEMPLATES[reason as RejectionReason] || [];
      const randomTemplate =
        templates[Math.floor(Math.random() * templates.length)] || "";

      const currentReason = REJECTION_REASONS.find((r) => r.value === reason);
      const suggestedNote = currentReason?.suggestedNote || "";

      // Combine template with base suggestion
      const finalNote = randomTemplate
        ? `${suggestedNote}\n\nDodatkowa uwaga: ${randomTemplate}`
        : suggestedNote;

      setNotes(finalNote);
      toast.success("Wygenerowano sugestię notatki");
    } catch {
      toast.error("Nie udało się wygenerować notatki");
    } finally {
      setIsGeneratingNote(false);
    }
  }, [reason]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid="verification-reject-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Dlaczego odrzucasz to ćwiczenie?
          </DialogTitle>
          <DialogDescription>
            {exerciseName ? (
              <>
                Odrzucasz <strong>&quot;{exerciseName}&quot;</strong>. Twoja notatka
                zostanie wysłana do autora jako wskazówka do poprawy.
              </>
            ) : (
              "Twoja notatka zostanie wysłana do autora jako wskazówka do poprawy."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Radio Group */}
          <div className="space-y-3">
            <Label>Powód odrzucenia *</Label>
            <RadioGroup
              value={reason}
              onValueChange={handleReasonChange}
              className="space-y-2"
            >
              {REJECTION_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    reason === r.value
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:border-border-light hover:bg-surface-light/50"
                  )}
                >
                  <RadioGroupItem
                    value={r.value}
                    id={r.value}
                    className="mt-0.5"
                    data-testid={`verification-reject-reason-${r.value}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{r.icon}</span>
                      <span className="font-medium text-sm">{r.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.hint}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Notes Textarea with AI helper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">
                Wskazówka dla autora *{" "}
                <span className="text-muted-foreground font-normal">
                  (min. 10 znaków)
                </span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateNote}
                disabled={!reason || isGeneratingNote}
                className="h-7 text-xs gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                data-testid="verification-reject-ai-suggest-btn"
              >
                {isGeneratingNote ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Zaproponuj tekst
              </Button>
            </div>
            <Textarea
              id="notes"
              placeholder="Opisz szczegółowo co wymaga poprawy. Ta wiadomość trafi do autora ćwiczenia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className={cn(
                "resize-none",
                notes.length > 0 && notes.length < 10 && "border-amber-500/50"
              )}
              data-testid="verification-reject-notes-input"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Ta wiadomość zostanie wysłana do autora
              </span>
              <span
                className={cn(
                  "text-muted-foreground",
                  notes.length > 0 && notes.length < 10 && "text-amber-600"
                )}
              >
                {notes.length} znaków
              </span>
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
              "Odrzuć definitywnie"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
