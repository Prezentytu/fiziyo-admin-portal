"use client";

import { AlertTriangle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface FeedbackBannerProps {
  /** Reviewer's notes/comments */
  adminReviewNotes: string;
  /** Date when changes were requested */
  updatedAt?: string;
  /** Optional callback when user wants to dismiss/acknowledge */
  onAcknowledge?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FeedbackBanner - Displays verifier feedback for rejected exercises
 * 
 * Shows:
 * - Warning icon and header
 * - Reviewer's comments
 * - Relative time since rejection
 * - Optional acknowledge button
 * 
 * Styling: Linear-style amber/orange warning
 */
export function FeedbackBanner({
  adminReviewNotes,
  updatedAt,
  onAcknowledge,
  className,
}: FeedbackBannerProps) {
  // Format relative time
  const relativeTime = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), {
        addSuffix: true,
        locale: pl,
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 mb-6",
        "bg-amber-500/10 border-amber-500/20",
        className
      )}
      data-testid="feedback-banner"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-semibold text-amber-600 text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Weryfikator zgłosił uwagi
            </h4>
            {relativeTime && (
              <span className="text-xs text-amber-600/70 flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                {relativeTime}
              </span>
            )}
          </div>

          {/* Review notes */}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {adminReviewNotes}
          </p>

          {/* Action */}
          {onAcknowledge && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onAcknowledge}
                className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                Rozumiem, poprawię
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-amber-600/60 mt-3 ml-8">
        Wprowadź poprawki i kliknij "Wyślij poprawki" aby ponownie zgłosić do weryfikacji
      </p>
    </div>
  );
}
