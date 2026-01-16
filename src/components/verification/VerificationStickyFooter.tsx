"use client";

import { XCircle, SkipForward, CheckCircle2, Loader2, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerificationStickyFooterProps {
  onReject: () => void;
  onSkip: () => void;
  onApprove: () => void;
  isLoading?: boolean;
  isRejectLoading?: boolean;
  isApproveLoading?: boolean;
  canApprove?: boolean;
  className?: string;
}

export function VerificationStickyFooter({
  onReject,
  onSkip,
  onApprove,
  isLoading,
  isRejectLoading,
  isApproveLoading,
  canApprove = true,
  className,
}: VerificationStickyFooterProps) {
  const anyLoading = isLoading || isRejectLoading || isApproveLoading;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 lg:left-64 z-40",
          "bg-background/95 backdrop-blur-md border-t border-border/60",
          "px-4 py-4 lg:px-8",
          className
        )}
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
                {isRejectLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="hidden sm:inline">Odrzuć</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-2">
              <span>Odrzuć ćwiczenie</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Ctrl+⌫</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Center: Skip + Keyboard hint */}
          <div className="flex items-center gap-2">
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
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Esc</kbd>
              </TooltipContent>
            </Tooltip>

            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/30">
                  <Keyboard className="h-3 w-3" />
                  <span>Skróty</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs space-y-1.5 p-3">
                <p className="font-semibold mb-2">Skróty klawiszowe</p>
                <div className="flex items-center justify-between gap-4">
                  <span>Zatwierdź</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Ctrl+↵</kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Odrzuć</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Ctrl+⌫</kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Pomiń</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Esc</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right: Approve */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                onClick={onApprove}
                disabled={anyLoading || !canApprove}
                className={cn(
                  "gap-2 px-6 font-bold shadow-lg transition-all",
                  "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90",
                  "hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]"
                )}
                data-testid="verification-approve-btn"
              >
                {isApproveLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span className="hidden sm:inline">Certyfikuj jako Standard FiziYo</span>
                <span className="sm:hidden">Zatwierdź</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex items-center gap-2">
              <span>Zatwierdź i opublikuj</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border font-mono">Ctrl+↵</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
