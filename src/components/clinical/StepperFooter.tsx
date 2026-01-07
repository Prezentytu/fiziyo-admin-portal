'use client';

import { ArrowLeft, ArrowRight, Save, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepperFooterProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSignAndComplete: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  canSign?: boolean;
  isSigned?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function StepperFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSaveDraft,
  onSignAndComplete,
  isLoading = false,
  isSaving = false,
  canSign = false,
  isSigned = false,
  readOnly = false,
  className,
}: StepperFooterProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isSummaryStep = isLastStep;

  // W trybie readOnly pokazujemy tylko nawigację (bez save/sign)
  const showOnlyNavigation = readOnly || isSigned;

  return (
    <div
      className={cn(
        'shrink-0 bg-surface border-t border-border py-4 px-6 rounded-b-lg',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Back button */}
        <div className="flex-1">
          {!isFirstStep && (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={isLoading}
              className="gap-2"
              data-testid="clinical-note-back-btn"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Wróć</span>
            </Button>
          )}
        </div>

        {/* Center - Save draft (tylko gdy nie jest read-only) */}
        {!showOnlyNavigation && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={isLoading || isSaving}
              className="gap-2"
              data-testid="clinical-note-save-draft-btn"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? 'Zapisywanie...' : 'Zapisz'}
              </span>
            </Button>
          </div>
        )}

        {/* Right side - Next or Sign */}
        <div className="flex-1 flex justify-end">
          {showOnlyNavigation ? (
            // W trybie read-only tylko przycisk Dalej (nawigacja)
            !isLastStep && (
              <Button
                variant="outline"
                onClick={onNext}
                className="gap-2"
              >
                <span className="hidden sm:inline">Dalej</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          ) :           isSummaryStep ? (
            <Button
              onClick={onSignAndComplete}
              disabled={isLoading || !canSign}
              className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary-dark hover:to-emerald-700 min-w-[180px]"
              data-testid="clinical-note-sign-btn"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Podpisz i zakończ
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={isLoading}
              className="gap-2"
              data-testid="clinical-note-next-btn"
            >
              <span className="hidden sm:inline">Dalej</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden mt-3 text-center text-xs text-muted-foreground">
        Krok {currentStep + 1} z {totalSteps}
      </div>
    </div>
  );
}
