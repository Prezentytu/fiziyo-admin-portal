"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  CheckCircle,
  XCircle,
  Video,
  FileText,
  Tag,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise } from "./ExerciseCard";

interface SubmitToGlobalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onConfirm: (exerciseId: string) => Promise<void>;
  isLoading?: boolean;
}

interface ValidationCheck {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  passed: boolean;
  critical: boolean;
}

/**
 * SubmitToGlobalDialog - Auto-Guard Validation before submission
 * 
 * Validates:
 * - Has video or image (critical)
 * - Description min 50 chars (critical)
 * - Has at least 2 tags (recommended)
 * - Has clinical description (recommended)
 */
export function SubmitToGlobalDialog({
  open,
  onOpenChange,
  exercise,
  onConfirm,
  isLoading = false,
}: SubmitToGlobalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation checks
  const validationChecks = useMemo<ValidationCheck[]>(() => {
    if (!exercise) return [];

    const hasMedia = !!(
      exercise.videoUrl ||
      exercise.gifUrl ||
      exercise.imageUrl ||
      exercise.thumbnailUrl ||
      (exercise.images && exercise.images.length > 0)
    );

    const descriptionLength = (
      exercise.patientDescription ||
      exercise.description ||
      ""
    ).trim().length;
    const hasDescription = descriptionLength >= 50;

    const tagCount = (exercise.mainTags?.length || 0) + (exercise.additionalTags?.length || 0);
    const hasTags = tagCount >= 2;

    const hasClinicalDesc = (exercise.clinicalDescription || "").trim().length >= 20;

    return [
      {
        id: "media",
        label: "Media",
        description: hasMedia
          ? "Wideo lub zdjęcie jest dostępne"
          : "Dodaj wideo lub zdjęcie do ćwiczenia",
        icon: <Video className="h-4 w-4" />,
        passed: hasMedia,
        critical: true,
      },
      {
        id: "description",
        label: "Opis pacjenta",
        description: hasDescription
          ? `${descriptionLength} znaków (minimum 50)`
          : `Tylko ${descriptionLength}/50 znaków - uzupełnij opis`,
        icon: <FileText className="h-4 w-4" />,
        passed: hasDescription,
        critical: true,
      },
      {
        id: "tags",
        label: "Kategorie",
        description: hasTags
          ? `${tagCount} kategorii przypisanych`
          : `Tylko ${tagCount}/2 kategorii - dodaj więcej tagów`,
        icon: <Tag className="h-4 w-4" />,
        passed: hasTags,
        critical: false,
      },
      {
        id: "clinical",
        label: "Opis kliniczny",
        description: hasClinicalDesc
          ? "Opis kliniczny jest dostępny"
          : "Zalecane: dodaj opis kliniczny dla fizjoterapeutów",
        icon: <FileText className="h-4 w-4" />,
        passed: hasClinicalDesc,
        critical: false,
      },
    ];
  }, [exercise]);

  const criticalFailed = validationChecks.filter((c) => c.critical && !c.passed);
  const recommendedFailed = validationChecks.filter((c) => !c.critical && !c.passed);
  const canSubmit = criticalFailed.length === 0;

  const handleSubmit = async () => {
    if (!exercise || !canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm(exercise.id);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Zgłoś do Bazy Globalnej
          </DialogTitle>
          <DialogDescription>
            Twoje ćwiczenie zostanie przesłane do weryfikacji przez zespół
            ekspertów. Po zatwierdzeniu będzie widoczne dla wszystkich użytkowników.
          </DialogDescription>
        </DialogHeader>

        {/* Exercise preview */}
        <div className="rounded-lg bg-muted/50 p-3 mb-4">
          <p className="font-medium text-sm truncate">{exercise.name}</p>
          {exercise.mainTags && exercise.mainTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(exercise.mainTags as string[]).slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {typeof tag === "string" ? tag : (tag as any).name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Validation checklist */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Automatyczna kontrola jakości
          </p>
          {validationChecks.map((check) => (
            <div
              key={check.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                check.passed
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : check.critical
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              )}
            >
              <div
                className={cn(
                  "shrink-0 mt-0.5",
                  check.passed
                    ? "text-emerald-500"
                    : check.critical
                    ? "text-red-500"
                    : "text-amber-500"
                )}
              >
                {check.passed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : check.critical ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      check.passed
                        ? "text-emerald-600"
                        : check.critical
                        ? "text-red-600"
                        : "text-amber-600"
                    )}
                  >
                    {check.label}
                  </span>
                  {check.critical && !check.passed && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                      Wymagane
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Warning for critical failures */}
        {!canSubmit && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              Uzupełnij wymagane dane przed zgłoszeniem
            </p>
          </div>
        )}

        {/* Info for recommended failures */}
        {canSubmit && recommendedFailed.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Zalecamy uzupełnienie brakujących danych dla lepszej jakości
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting || isLoading}
            className="gap-2"
          >
            {isSubmitting || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {canSubmit ? "Zgłoś do weryfikacji" : "Uzupełnij dane"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
