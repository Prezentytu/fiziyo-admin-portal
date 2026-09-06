'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Loader2, Rocket, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Exercise } from './ExerciseCard';
import { verificationCopy } from '@/features/verification/verificationCopy';
import { useDialogShortcuts } from '@/hooks/useDialogShortcuts';

interface SubmitToOrganizationDialogProps {
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
  passed: boolean;
}

export function SubmitToOrganizationDialog({
  open,
  onOpenChange,
  exercise,
  onConfirm,
  isLoading = false,
}: SubmitToOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationChecks = useMemo<ValidationCheck[]>(() => {
    if (!exercise) return [];

    const hasMedia = !!(
      exercise.videoUrl ||
      exercise.gifUrl ||
      exercise.imageUrl ||
      exercise.thumbnailUrl ||
      (exercise.images && exercise.images.length > 0)
    );

    const descriptionLength = (exercise.patientDescription || exercise.description || '').trim().length;
    const hasDescription = descriptionLength >= 30;

    return [
      {
        id: 'media',
        label: 'Media',
        description: hasMedia ? 'Wideo lub zdjęcie jest dostępne' : 'Zalecane: dodaj wideo lub zdjęcie do ćwiczenia',
        passed: hasMedia,
      },
      {
        id: 'description',
        label: 'Opis pacjenta',
        description: hasDescription
          ? `${descriptionLength} znaków opisu`
          : `Zalecane: rozwiń opis pacjenta (obecnie ${descriptionLength} znaków)`,
        passed: hasDescription,
      },
    ];
  }, [exercise]);

  const hasSuggestions = validationChecks.some((check) => !check.passed);
  const canSubmit = Boolean(exercise?.name?.trim());

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

  useDialogShortcuts({
    open,
    enabled: !isSubmitting && !isLoading,
    onSubmit: () => {
      void handleSubmit();
    },
    onClose: () => onOpenChange(false),
  });

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="exercise-submit-to-org-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {verificationCopy.submitOrganization}
          </DialogTitle>
          <DialogDescription>
            Ćwiczenie trafi do kolejki weryfikacji Twojej organizacji. Możesz zgłosić je od razu, a brakujące elementy
            uzupełnić później.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 mb-4">
          <p className="font-medium text-sm truncate">{exercise.name}</p>
          {exercise.mainTags && exercise.mainTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(exercise.mainTags as string[]).slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sugestie przed zgłoszeniem
          </p>
          {validationChecks.map((check) => (
            <div
              key={check.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                check.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
              )}
            >
              <div className={cn('shrink-0 mt-0.5', check.passed ? 'text-emerald-500' : 'text-amber-500')}>
                {check.passed ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {check.id === 'media' ? (
                    <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={cn('text-sm font-medium', check.passed ? 'text-emerald-600' : 'text-amber-600')}>
                    {check.label}
                  </span>
                  {!check.passed && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                      Zalecane
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        {hasSuggestions && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Brakujące elementy są tylko rekomendacją i nie blokują zgłoszenia
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            data-testid="exercise-submit-to-organization-dialog-btn-169"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button
            data-testid="submittoorganizationdialog-button-162"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting || isLoading}
            className="gap-2"
          >
            {isSubmitting || isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {hasSuggestions ? verificationCopy.submitDespiteSuggestions : verificationCopy.submitToVerification}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
