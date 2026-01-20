"use client";

import { useMemo } from "react";
import {
  XCircle,
  SkipForward,
  CheckCircle2,
  Loader2,
  Keyboard,
  Database,
  ChevronRight,
  Save,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { KeyboardShortcutsHint } from "@/hooks/useVerificationHotkeys";
import { useSidebarState } from "@/hooks/useSidebarState";

interface ValidationError {
  id: string;
  message: string;
}

interface VerificationStickyFooterV2Props {
  /** Callback: Zatwierdź i przejdź dalej */
  onApproveAndNext: () => void;
  /** Callback: Odrzuć ćwiczenie */
  onReject: () => void;
  /** Callback: Pomiń ćwiczenie */
  onSkip?: () => void;
  /** Czy walidacja automatyczna przeszła (bez checkboxa) */
  validationPassed?: boolean;
  /** Lista błędów walidacji */
  validationErrors?: ValidationError[];
  /** Czy checkbox kliniczny jest zaznaczony */
  clinicalCheckboxChecked?: boolean;
  /** Callback przy zmianie checkboxa */
  onClinicalCheckboxChange?: (checked: boolean) => void;
  /** Czy trwa odrzucanie */
  isRejecting?: boolean;
  /** Czy trwa zatwierdzanie */
  isApproving?: boolean;
  /** Liczba pozostałych ćwiczeń */
  remainingTasksCount?: number;
  /** Czy trwa zapisywanie draftu */
  isSavingDraft?: boolean;
  /** Ostatni czas zapisu */
  lastSavedTime?: Date | null;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * VerificationStickyFooterV2 - Panel sterowania z Approve & Next flow
 *
 * Clinical Operator UI - Fixed footer z:
 * - Checkbox bezpieczeństwa klinicznego
 * - Inline walidacja błędów
 * - Approve & Next workflow
 *
 * Skróty klawiszowe:
 * - CMD/CTRL + Enter → Zatwierdź i Następne
 * - CMD/CTRL + Backspace → Odrzuć
 * - Escape → Pomiń
 */
export function VerificationStickyFooterV2({
  onApproveAndNext,
  onReject,
  onSkip,
  validationPassed = true,
  validationErrors = [],
  clinicalCheckboxChecked = false,
  onClinicalCheckboxChange,
  isRejecting = false,
  isApproving = false,
  remainingTasksCount = 0,
  isSavingDraft = false,
  lastSavedTime,
  className,
}: VerificationStickyFooterV2Props) {
  const anyLoading = isRejecting || isApproving;

  // Sidebar state for dynamic left offset
  const { isCollapsed, isHydrated } = useSidebarState();

  // Can publish only if checkbox checked AND validation passed
  const canPublish = clinicalCheckboxChecked && validationPassed;

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSavedTime) return null;

    const now = new Date();
    const diff = now.getTime() - lastSavedTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return "Zapisano przed chwilą";
    if (seconds < 60) return `Zapisano ${seconds}s temu`;
    if (minutes < 60) return `Zapisano ${minutes}min temu`;
    return `Zapisano o ${lastSavedTime.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [lastSavedTime]);

  // Detect Mac for keyboard shortcuts display
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  const hasMoreExercises = remainingTasksCount > 0;

  return (
    <TooltipProvider>
      <div
        className={cn(
          // FIXED position with dynamic sidebar offset
          "fixed bottom-0 right-0 z-50",
          // Left offset: 0 on mobile, 72px when collapsed, 256px when expanded
          "left-0",
          isHydrated && "lg:transition-all lg:duration-300",
          isHydrated && (isCollapsed ? "lg:left-[72px]" : "lg:left-64"),
          // Styling
          "bg-background/95 backdrop-blur-md border-t border-border/60",
          "px-4 py-3 sm:py-4 lg:px-6",
          className
        )}
        data-testid="verification-sticky-footer"
      >
        {/* Main footer row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Clinical Checkbox + Validation Status */}
          <div className="flex items-center gap-4">
            {/* Clinical safety checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="clinical-checkbox"
                checked={clinicalCheckboxChecked}
                onCheckedChange={(checked) => onClinicalCheckboxChange?.(checked === true)}
                disabled={anyLoading}
                className="h-5 w-5 border-2"
                data-testid="verification-clinical-checkbox"
              />
              <Label
                htmlFor="clinical-checkbox"
                className={cn(
                  "text-sm cursor-pointer select-none hidden sm:flex items-center gap-1.5",
                  clinicalCheckboxChecked ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                <ShieldCheck className={cn(
                  "h-4 w-4",
                  clinicalCheckboxChecked ? "text-emerald-600" : "text-muted-foreground"
                )} />
                <span className="hidden md:inline">Potwierdzam poprawność kliniczną</span>
                <span className="md:hidden">Poprawność kliniczna</span>
              </Label>
            </div>

            {/* Validation status - inline */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              {validationErrors.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 text-amber-600 px-2 py-1 rounded-md bg-amber-500/10">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{validationErrors.length} {validationErrors.length === 1 ? "błąd" : "błędów"}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <ul className="text-xs space-y-1">
                      {validationErrors.map((err) => (
                        <li key={err.id} className="flex items-center gap-1">
                          <span className="text-amber-500">•</span> {err.message}
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 px-2 py-1 rounded-md bg-emerald-500/10">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Gotowe</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Save status + Skip + Keyboard hint */}
          <div className="flex items-center gap-2">
            {/* Save status */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              {isSavingDraft ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Zapisuję...
                </span>
              ) : lastSavedText ? (
                <span className="flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  {lastSavedText}
                </span>
              ) : null}
            </div>

            {/* Skip button */}
            {onSkip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    disabled={anyLoading}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                    data-testid="verification-skip-btn"
                  >
                    <SkipForward className="h-4 w-4" />
                    <span className="hidden sm:inline">Pomiń</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                  <span>Pomiń ćwiczenie</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">
                    Esc
                  </kbd>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/30 cursor-help">
                  <Keyboard className="h-3 w-3" />
                  <span>{modKey}+↵</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <KeyboardShortcutsHint />
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right: Reject + Approve */}
          <div className="flex items-center gap-2">
            {/* Reject button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={onReject}
                  disabled={anyLoading}
                  className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  data-testid="verification-reject-btn"
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Odrzuć</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>Odrzuć ćwiczenie</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">
                  {modKey}+⌫
                </kbd>
              </TooltipContent>
            </Tooltip>

            {/* Remaining count badge */}
            {remainingTasksCount > 0 && (
              <Badge
                variant="secondary"
                className="hidden md:flex text-xs bg-muted/50"
              >
                {remainingTasksCount}
              </Badge>
            )}

            {/* Approve button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="default"
                  onClick={onApproveAndNext}
                  disabled={anyLoading || !canPublish}
                  className={cn(
                    "gap-2 px-4 sm:px-6 font-bold shadow-lg transition-all",
                    "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90",
                    "hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]",
                    !canPublish && "opacity-50 cursor-not-allowed"
                  )}
                  data-testid="verification-approve-btn"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    Publikuj{hasMoreExercises ? " i Następne" : ""}
                  </span>
                  <span className="sm:hidden">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {hasMoreExercises && (
                    <ChevronRight className="h-4 w-4 hidden sm:block" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>
                  {!clinicalCheckboxChecked
                    ? "Zaznacz checkbox bezpieczeństwa"
                    : !validationPassed
                    ? "Popraw błędy walidacji"
                    : hasMoreExercises
                    ? "Zatwierdź i przejdź do następnego"
                    : "Zatwierdź i zakończ"}
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">
                  {modKey}+↵
                </kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile: Validation errors row */}
        {validationErrors.length > 0 && (
          <div className="lg:hidden mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {validationErrors.map(e => e.message).join(", ")}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
