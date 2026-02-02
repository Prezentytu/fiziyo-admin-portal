"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  RefreshCw,
  Play,
  Eye,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExerciseRelationTarget } from "@/graphql/types/adminExercise.types";

// Difficulty level labels and colors
const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Początkujący",
  Beginner: "Początkujący",
  EASY: "Łatwy",
  Easy: "Łatwy",
  MEDIUM: "Średni",
  Medium: "Średni",
  HARD: "Trudny",
  Hard: "Trudny",
  EXPERT: "Ekspert",
  Expert: "Ekspert",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  EASY: "bg-green-500/10 text-green-600 border-green-500/20",
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  HARD: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  EXPERT: "bg-red-500/10 text-red-600 border-red-500/20",
  Expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface RelationSlotProps {
  /** Typ slotu: regresja (łatwiej) lub progresja (trudniej) */
  type: "regression" | "progression";
  /** Ćwiczenie docelowe (może być null) */
  exercise: ExerciseRelationTarget | null;
  /** Callback przy zmianie relacji */
  onSwap: () => void;
  /** Callback przy usunięciu relacji */
  onRemove: () => void;
  /** Callback przy dodaniu placeholder (gdy brak ćwiczenia w bazie) */
  onAddPlaceholder?: () => void;
  /** Etykieta dla pustego slotu */
  emptyLabel?: string;
  /** Czy slot jest disabled */
  disabled?: boolean;
  /** Czy trwa ładowanie */
  isLoading?: boolean;
  /** Ostrzeżenie o niezgodności poziomów */
  warning?: string | null;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * RelationSlot - Mini-karta dla regresji/progresji
 *
 * Wizualizacja:
 * - Thumbnail wideo (animowany gif on hover)
 * - Nazwa ćwiczenia
 * - Poziom trudności (badge)
 * - Akcje: Wymień (Swap), Usuń (Unlink), Podgląd (Preview)
 *
 * Stany:
 * - Puste: Pokazuje przycisk "+ Dodaj"
 * - Wypełnione: Pokazuje kartę ćwiczenia
 * - AI Suggested: Z oznaczeniem sugestii AI
 * - Loading: Spinner
 */
export function RelationSlot({
  type,
  exercise,
  onSwap,
  onRemove,
  onAddPlaceholder,
  emptyLabel,
  disabled = false,
  isLoading = false,
  warning,
  className,
  "data-testid": testId,
}: RelationSlotProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isRegression = type === "regression";
  const Icon = isRegression ? ArrowLeft : ArrowRight;
  const label = isRegression ? "Regresja (Łatwiej)" : "Progresja (Trudniej)";
  const defaultEmptyLabel = isRegression
    ? "Dodaj łatwiejszą wersję"
    : "Dodaj trudniejszą wersję";

  // Get media URL for preview
  const mediaUrl = exercise?.gifUrl || exercise?.thumbnailUrl;

  // Empty state
  if (!exercise && !isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 w-[180px]",
          className
        )}
        data-testid={testId}
      >
        {/* Label */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>

        {/* Empty slot */}
        <button
          onClick={onSwap}
          disabled={disabled}
          className={cn(
            "w-full aspect-video rounded-lg border-2 border-dashed border-border/60",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground text-sm",
            "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
            "transition-all cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          data-testid={`${testId}-add-btn`}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs text-center px-2">
            {emptyLabel || defaultEmptyLabel}
          </span>
        </button>

        {/* Add placeholder option */}
        {onAddPlaceholder && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground"
            onClick={onAddPlaceholder}
            disabled={disabled}
          >
            + Dodaj placeholder
          </Button>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 w-[180px]",
          className
        )}
        data-testid={testId}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>
        <div className="w-full aspect-video rounded-lg border border-border/60 bg-surface flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Filled state
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col items-center gap-2 w-[180px]",
          className
        )}
        data-testid={testId}
      >
        {/* Label */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
          {exercise?.isAISuggested && !exercise?.isVerified && (
            <Tooltip>
              <TooltipTrigger>
                <Sparkles className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Sugestia AI</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Exercise card */}
        <Card
          className={cn(
            "w-full overflow-hidden transition-all group cursor-pointer",
            "border-border/60 hover:border-primary/40 hover:shadow-md",
            warning && "border-amber-500/50",
            exercise?.isAISuggested && !exercise?.isVerified && "border-dashed border-amber-500/40"
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={() => setIsPreviewOpen(true)}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video bg-zinc-900">
            {mediaUrl ? (
              <img
                src={isHovering && exercise?.gifUrl ? exercise.gifUrl : (exercise?.thumbnailUrl || mediaUrl)}
                alt={exercise?.name || "Exercise"}
                className="w-full h-full object-cover transition-all"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Play className="h-8 w-8 opacity-30" />
              </div>
            )}

            {/* Hover overlay with actions */}
            <div
              className={cn(
                "absolute inset-0 bg-black/60 flex items-center justify-center gap-2",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Podgląd</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwap();
                    }}
                    disabled={disabled}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wymień</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Usuń powiązanie</TooltipContent>
              </Tooltip>
            </div>

            {/* AI suggestion badge */}
            {exercise?.isAISuggested && !exercise?.isVerified && (
              <Badge
                className="absolute top-1 left-1 text-[9px] px-1.5 py-0 bg-amber-500/90 text-white border-0"
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium truncate" title={exercise?.name}>
              {exercise?.name}
            </p>
            <div className="flex items-center gap-1.5">
              {exercise?.difficultyLevel && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    DIFFICULTY_COLORS[exercise.difficultyLevel] || ""
                  )}
                >
                  {DIFFICULTY_LABELS[exercise.difficultyLevel] || exercise.difficultyLevel}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Warning */}
        {warning && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>{warning}</span>
          </div>
        )}

        {/* Preview Dialog */}
        <ExercisePreviewDialog
          exercise={exercise}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * Exercise Preview Dialog
 */
interface ExercisePreviewDialogProps {
  exercise: ExerciseRelationTarget | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ExercisePreviewDialog({
  exercise,
  open,
  onOpenChange,
}: ExercisePreviewDialogProps) {
  if (!exercise) return null;

  const mediaUrl = exercise.gifUrl || exercise.thumbnailUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Media */}
          {mediaUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-zinc-900">
              <img
                src={exercise.gifUrl || exercise.thumbnailUrl}
                alt={exercise.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex flex-wrap gap-2">
            {exercise.difficultyLevel && (
              <Badge
                variant="outline"
                className={DIFFICULTY_COLORS[exercise.difficultyLevel] || ""}
              >
                {DIFFICULTY_LABELS[exercise.difficultyLevel] || exercise.difficultyLevel}
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
