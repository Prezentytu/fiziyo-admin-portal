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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KeyboardShortcutsHint } from "@/hooks/useVerificationHotkeys";

interface VerificationStickyFooterV2Props {
  /** Callback: Zatwierdź i przejdź dalej */
  onApproveAndNext: () => void;
  /** Callback: Odrzuć ćwiczenie */
  onReject: () => void;
  /** Callback: Pomiń ćwiczenie */
  onSkip?: () => void;
  /** Czy można zatwierdzić */
  canApprove?: boolean;
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
 * Funkcje:
 * - Approve & Next: automatyczne przejście do następnego ćwiczenia
 * - Status zapisu: informacja o ostatnim zapisie
 * - Licznik pozostałych: ile ćwiczeń zostało
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
  canApprove = true,
  isRejecting = false,
  isApproving = false,
  remainingTasksCount = 0,
  isSavingDraft = false,
  lastSavedTime,
  className,
}: VerificationStickyFooterV2Props) {
  const anyLoading = isRejecting || isApproving;

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
          "sticky bottom-0 z-40",
          "bg-background/95 backdrop-blur-md border-t border-border/60",
          "px-4 py-3 sm:py-4 lg:px-8",
          className
        )}
        data-testid="verification-sticky-footer"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Reject */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                onClick={onReject}
                disabled={anyLoading}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                data-testid="verification-reject-btn"
              >
                {isRejecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
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

          {/* Center: Status + Skip + Keyboard hint */}
          <div className="flex items-center gap-3">
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
                    size="lg"
                    onClick={onSkip}
                    disabled={anyLoading}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    data-testid="verification-skip-btn"
                  >
                    <SkipForward className="h-5 w-5" />
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
                <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/30 cursor-help">
                  <Keyboard className="h-3 w-3" />
                  <span>Skróty</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <KeyboardShortcutsHint />
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right: Approve & Next */}
          <div className="flex items-center gap-3">
            {/* Remaining count badge */}
            {remainingTasksCount > 0 && (
              <Badge
                variant="secondary"
                className="hidden sm:flex text-xs bg-muted/50"
              >
                {remainingTasksCount} pozostało
              </Badge>
            )}

            {/* Approve button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  onClick={onApproveAndNext}
                  disabled={anyLoading || !canApprove}
                  className={cn(
                    "gap-2 px-6 font-bold shadow-lg transition-all",
                    "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90",
                    "hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]",
                    !canApprove && "opacity-50"
                  )}
                  data-testid="verification-approve-btn"
                >
                  {isApproving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Database className="h-5 w-5" />
                  )}
                  <span className="hidden sm:inline">
                    Publikuj{hasMoreExercises ? " i Następne" : ""}
                  </span>
                  <span className="sm:hidden">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  {hasMoreExercises && (
                    <ChevronRight className="h-4 w-4 hidden sm:block" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>
                  {hasMoreExercises
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

        {/* Mobile: Bottom hint */}
        <div className="sm:hidden mt-2 text-center text-xs text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">{modKey}</kbd>
          +
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
          {" "}aby zatwierdzić
        </div>
      </div>
    </TooltipProvider>
  );
}
