"use client";

import {
  XCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/useSidebarState";

interface VerificationStickyFooterV2Props {
  /** Callback: Zatwierdź i przejdź dalej */
  onApproveAndNext: () => void;
  /** Callback: Odrzuć ćwiczenie */
  onReject: () => void;
  /** Callback: Zapisz szkic */
  onSaveDraft?: () => void;
  /** Czy walidacja automatyczna przeszła */
  validationPassed?: boolean;
  /** Lista brakujących pól (do tooltipa) */
  missingFields?: string[];
  /** Czy checkbox kliniczny jest zaznaczony (legacy - opcjonalne) */
  clinicalCheckboxChecked?: boolean;
  /** Callback przy zmianie checkboxa (legacy - opcjonalne) */
  onClinicalCheckboxChange?: (checked: boolean) => void;
  /** Czy trwa odrzucanie */
  isRejecting?: boolean;
  /** Czy trwa zatwierdzanie */
  isApproving?: boolean;
  /** Czy trwa zapisywanie szkicu */
  isSavingDraft?: boolean;
  /** Liczba pozostałych ćwiczeń */
  remainingTasksCount?: number;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * VerificationStickyFooterV2 - Footer z Quality Gate
 *
 * Layout:
 * [Zapisz szkic] ... [Odeślij do poprawki] [Zatwierdź i Opublikuj + Tooltip]
 *
 * Funkcje:
 * - Przycisk "Zapisz szkic" (ghost) po lewej
 * - Przycisk "Odeślij do poprawki" (outline)
 * - Przycisk "Zatwierdź i Opublikuj" (primary) z Tooltipem gdy disabled
 * - Tooltip pokazuje listę brakujących pól
 */
export function VerificationStickyFooterV2({
  onApproveAndNext,
  onReject,
  onSaveDraft,
  validationPassed = true,
  missingFields = [],
  clinicalCheckboxChecked = true, // Legacy - domyślnie true jeśli nie używane
  onClinicalCheckboxChange,
  isRejecting = false,
  isApproving = false,
  isSavingDraft = false,
  remainingTasksCount = 0,
  className,
}: VerificationStickyFooterV2Props) {
  const anyLoading = isRejecting || isApproving || isSavingDraft;

  // Sidebar state for dynamic left offset
  const { isCollapsed, isHydrated } = useSidebarState();

  // Can publish only if validation passed (and optionally checkbox checked)
  const canPublish = validationPassed && missingFields.length === 0 && clinicalCheckboxChecked;
  const hasMoreExercises = remainingTasksCount > 0;

  return (
    <TooltipProvider>
      <div
        className={cn(
          // FIXED position with dynamic sidebar offset
          "fixed bottom-0 right-0 z-50",
          "left-0",
          isHydrated && "lg:transition-all lg:duration-300",
          isHydrated && (isCollapsed ? "lg:left-[72px]" : "lg:left-64"),
          // Styling
          "bg-background border-t border-border",
          "px-4 py-3 lg:px-6",
          className
        )}
        data-testid="verification-sticky-footer"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Save Draft */}
          <div className="flex items-center gap-2">
            {onSaveDraft && (
              <Button
                variant="ghost"
                size="default"
                onClick={onSaveDraft}
                disabled={anyLoading}
                className="gap-2 text-muted-foreground hover:text-foreground"
                data-testid="verification-save-draft-btn"
              >
                {isSavingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Zapisz szkic</span>
              </Button>
            )}
          </div>

          {/* Right: Reject + Approve */}
          <div className="flex items-center gap-3">
            {/* Reject button */}
            <Button
              variant="outline"
              size="default"
              onClick={onReject}
              disabled={anyLoading}
              className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/50"
              data-testid="verification-reject-btn"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Odeślij do poprawki</span>
              <span className="sm:hidden">Odrzuć</span>
            </Button>

            {/* Approve button with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Wrapper span needed for disabled button tooltip */}
                <span tabIndex={canPublish ? -1 : 0} className="inline-flex">
                  <Button
                    size="default"
                    onClick={onApproveAndNext}
                    disabled={anyLoading || !canPublish}
                    className={cn(
                      "gap-2 px-5 font-semibold",
                      canPublish
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                    data-testid="verification-approve-btn"
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      Zatwierdź{hasMoreExercises ? " i Następne" : ""}
                    </span>
                    <span className="sm:hidden">Publikuj</span>
                    {hasMoreExercises && (
                      <ChevronRight className="h-4 w-4 hidden sm:block" />
                    )}
                  </Button>
                </span>
              </TooltipTrigger>

              {/* Tooltip content - only show when cannot publish */}
              {!canPublish && missingFields.length > 0 && (
                <TooltipContent
                  side="top"
                  align="end"
                  className="bg-red-600 text-white border-0 max-w-xs p-3"
                >
                  <p className="font-medium mb-2">Uzupełnij przed publikacją:</p>
                  <ul className="list-disc pl-4 text-sm space-y-0.5">
                    {missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
