"use client";

import { useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Eye,
  Shield,
  Activity,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

// ============================================
// QUICK REJECT CHIPS - Predefined rejection reasons
// ============================================
const QUICK_REJECT_REASONS = [
  {
    id: 'lighting',
    label: 'Złe oświetlenie',
    text: 'Wideo ma niewystarczające oświetlenie. Proszę nagrać ponownie w jasnym miejscu, najlepiej przy świetle dziennym lub z dobrym sztucznym oświetleniem.'
  },
  {
    id: 'name',
    label: 'Błąd w nazwie',
    text: 'Nazwa ćwiczenia zawiera błąd lub jest nieprecyzyjna. Proszę poprawić nazwę zgodnie z nomenklaturą fizjoterapeutyczną.'
  },
  {
    id: 'technique',
    label: 'Niepoprawna technika',
    text: 'Technika wykonania ćwiczenia wymaga poprawy. Proszę zwrócić uwagę na prawidłową biomechanikę ruchu i bezpieczeństwo kręgosłupa.'
  },
  {
    id: 'framing',
    label: 'Zły kadr',
    text: 'Kadrowanie nie pokazuje całego ruchu lub kluczowe elementy są ucięte. Proszę nagrać ponownie tak, aby cały ruch był widoczny od początku do końca.'
  },
  {
    id: 'audio',
    label: 'Problem z audio',
    text: 'Jakość dźwięku jest niewystarczająca lub występują szumy/zakłócenia. Proszę nagrać ponownie w cichym otoczeniu lub z lepszym mikrofonem.'
  },
];

interface SafetyCheckItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
}

interface VerdictPanelProps {
  /** Exercise status */
  status: string;
  /** Submission date (for "waiting since X") */
  submittedAt?: string;
  /** Callback: Approve and publish */
  onApprove: () => void;
  /** Callback: Send back for changes */
  onRequestChanges: () => void;
  /** Callback: Reject permanently */
  onReject: () => void;
  /** Callback: Unpublish (for published exercises) */
  onUnpublish?: () => void;
  /** Comment for author */
  comment: string;
  /** Callback when comment changes */
  onCommentChange: (comment: string) => void;
  /** Whether validation passed */
  validationPassed?: boolean;
  /** List of missing fields */
  missingFields?: string[];
  /** Safety checklist state */
  safetyChecklist: {
    videoReadable: boolean;
    techniqueSafe: boolean;
    noContraindications: boolean;
  };
  /** Callback when safety checklist changes */
  onSafetyChecklistChange: (checklist: {
    videoReadable: boolean;
    techniqueSafe: boolean;
    noContraindications: boolean;
  }) => void;
  /** Loading states */
  isApproving?: boolean;
  isRejecting?: boolean;
  isUnpublishing?: boolean;
  /** Remaining exercises count */
  remainingCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VerdictPanel - Right column for verification decisions
 *
 * Contains:
 * - Status indicator with wait time
 * - Safety checklist (required before approval)
 * - Comment textarea for author feedback
 * - Action buttons: Approve, Request Changes, Reject
 */
export function VerdictPanel({
  status,
  submittedAt,
  onApprove,
  onRequestChanges,
  onReject,
  onUnpublish,
  comment,
  onCommentChange,
  validationPassed = false,
  missingFields = [],
  safetyChecklist,
  onSafetyChecklistChange,
  isApproving = false,
  isRejecting = false,
  isUnpublishing = false,
  remainingCount = 0,
  className,
}: VerdictPanelProps) {
  const anyLoading = isApproving || isRejecting || isUnpublishing;

  // Format wait time
  const waitTime = useMemo(() => {
    if (!submittedAt) return null;
    try {
      return formatDistanceToNow(new Date(submittedAt), {
        addSuffix: false,
        locale: pl,
      });
    } catch {
      return null;
    }
  }, [submittedAt]);

  // Safety checks - Clinical Precision labels
  const safetyItems: SafetyCheckItem[] = [
    {
      id: "videoReadable",
      label: "Wideo ostre i dobrze oświetlone",
      icon: <Eye className="h-3.5 w-3.5" />,
      checked: safetyChecklist.videoReadable,
    },
    {
      id: "techniqueSafe",
      label: "Bezpieczna technika wykonania",
      icon: <Shield className="h-3.5 w-3.5" />,
      checked: safetyChecklist.techniqueSafe,
    },
    {
      id: "noContraindications",
      label: "Brak przeciwwskazań i ryzyk",
      icon: <Activity className="h-3.5 w-3.5" />,
      checked: safetyChecklist.noContraindications,
    },
  ];

  const allSafetyChecked = Object.values(safetyChecklist).every(Boolean);
  const canApprove = validationPassed && allSafetyChecked && missingFields.length === 0;
  const hasMoreExercises = remainingCount > 0;
  const isPublished = status === "PUBLISHED";

  const handleSafetyChange = (id: string, checked: boolean) => {
    onSafetyChecklistChange({
      ...safetyChecklist,
      [id]: checked,
    });
  };

  // Status badge color
  const statusConfig = {
    PENDING_REVIEW: { label: "Oczekuje", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
    CHANGES_REQUESTED: { label: "Do poprawy", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
    PUBLISHED: { label: "Opublikowane", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
    APPROVED: { label: "Zatwierdzone", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
    ARCHIVED_GLOBAL: { label: "Wycofane", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    DRAFT: { label: "Szkic", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col h-full bg-zinc-950/50 border-l border-zinc-800/50",
          className
        )}
        data-testid="verdict-panel"
      >
        {/* Header: Status */}
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", currentStatus.color)}
            >
              {currentStatus.label}
            </Badge>
            {waitTime && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {waitTime}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground">Decyzja</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublished
              ? "Zarządzaj opublikowanym ćwiczeniem"
              : "Sprawdź i zatwierdź lub odeślij do poprawki"}
          </p>
        </div>

        {/* Safety Checklist (only for non-published) */}
        {!isPublished && (
          <div className="p-4 border-b border-zinc-800/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Checklista bezpieczeństwa
            </h4>
            <div className="space-y-2.5">
              {safetyItems.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-zinc-800/50",
                    item.checked && "bg-emerald-500/5"
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={(checked) =>
                      handleSafetyChange(item.id, checked === true)
                    }
                    disabled={anyLoading}
                    className={cn(
                      "border-zinc-600",
                      item.checked && "border-emerald-500 bg-emerald-500"
                    )}
                    data-testid={`safety-check-${item.id}`}
                  />
                  <span
                    className={cn(
                      "text-zinc-500",
                      item.checked && "text-emerald-400"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      item.checked ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Validation status */}
            {!validationPassed && missingFields.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Brakujące dane:
                </p>
                <ul className="text-xs text-red-300/80 space-y-0.5 pl-5 list-disc">
                  {missingFields.slice(0, 4).map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                  {missingFields.length > 4 && (
                    <li>+{missingFields.length - 4} więcej...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Comment for Author */}
        <div className="p-4 flex-1 overflow-y-auto">
          <Label
            htmlFor="author-comment"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Komentarz dla autora
          </Label>
          <Textarea
            id="author-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={
              isPublished
                ? "Powód wycofania z bazy (opcjonalnie)..."
                : "Wpisz uwagi dla autora (widoczne przy odrzuceniu)..."
            }
            disabled={anyLoading}
            className={cn(
              "min-h-[100px] resize-none text-sm",
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-700",
              "placeholder:text-zinc-600"
            )}
            data-testid="verdict-comment-textarea"
          />
          <p className="text-[10px] text-zinc-600 mt-1.5">
            {isPublished
              ? "Opcjonalne - wyjaśnienie dla autora"
              : "Wymagane przy odrzuceniu lub odesłaniu do poprawki"}
          </p>

          {/* Quick Reject Chips */}
          {!isPublished && (
            <div className="mt-3">
              <p className="text-[10px] text-zinc-500 mb-2">Szybkie powody:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REJECT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => {
                      const newComment = comment
                        ? `${comment}\n\n${reason.text}`
                        : reason.text;
                      onCommentChange(newComment);
                    }}
                    disabled={anyLoading}
                    className={cn(
                      "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                      "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50",
                      "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    data-testid={`quick-reject-${reason.id}`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-zinc-800/50 space-y-2.5">
          {isPublished ? (
            /* Published state: Unpublish button */
            <Button
              variant="destructive"
              size="default"
              onClick={onUnpublish}
              disabled={anyLoading}
              className="w-full gap-2"
              data-testid="verdict-unpublish-btn"
            >
              {isUnpublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Wycofaj z Bazy Globalnej
            </Button>
          ) : (
            /* Pending/Changes Requested state: Standard actions */
            <>
              {/* Approve button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex w-full">
                    <Button
                      size="default"
                      onClick={onApprove}
                      disabled={anyLoading || !canApprove}
                      className={cn(
                        "w-full gap-2 font-semibold",
                        canApprove
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                      data-testid="verdict-approve-btn"
                    >
                      {isApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Zatwierdź i Opublikuj
                      {hasMoreExercises && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canApprove && (
                  <TooltipContent
                    side="top"
                    className="bg-zinc-900 border-zinc-700 max-w-xs"
                  >
                    <p className="text-xs">
                      {!allSafetyChecked
                        ? "Zaznacz wszystkie punkty checklisty"
                        : "Uzupełnij brakujące dane"}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Request Changes button */}
              <Button
                variant="outline"
                size="default"
                onClick={onRequestChanges}
                disabled={anyLoading || !comment.trim()}
                className={cn(
                  "w-full gap-2",
                  "border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                )}
                data-testid="verdict-request-changes-btn"
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Odeślij do poprawki
              </Button>

              {/* Reject button */}
              <Button
                variant="ghost"
                size="default"
                onClick={onReject}
                disabled={anyLoading || !comment.trim()}
                className="w-full gap-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                data-testid="verdict-reject-btn"
              >
                <XCircle className="h-4 w-4" />
                Odrzuć na stałe
              </Button>
            </>
          )}

          {/* Remaining count indicator */}
          {!isPublished && hasMoreExercises && (
            <p className="text-center text-xs text-zinc-600 pt-1">
              Pozostało:{" "}
              <span className="text-zinc-400 font-medium">{remainingCount}</span>{" "}
              ćwiczeń w kolejce
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
