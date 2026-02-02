"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  RefreshCcw,
  Loader2,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExerciseSearchPopover } from "./ExerciseSearchPopover";
import {
  GET_EXERCISE_RELATIONSHIPS_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  SET_EXERCISE_RELATION_MUTATION,
  REMOVE_EXERCISE_RELATION_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type {
  AdminExercise,
  ExerciseRelationTarget,
  GetExerciseRelationshipsResponse,
} from "@/graphql/types/adminExercise.types";
import { getMediaUrl } from "@/utils/mediaUrl";

// Difficulty level order for validation
const DIFFICULTY_ORDER: Record<string, number> = {
  BEGINNER: 1, Beginner: 1, Początkujący: 1,
  EASY: 2, Easy: 2, Łatwy: 2,
  MEDIUM: 3, Medium: 3, Średni: 3, Średniozaawansowany: 3,
  HARD: 4, Hard: 4, Trudny: 4,
  EXPERT: 5, Expert: 5, Zaawansowany: 5, Ekspert: 5,
};

interface ProgressionChainProps {
  /** Aktualne ćwiczenie */
  exercise: AdminExercise;
  /** Callback gdy relacje się zmienią */
  onRelationsChange?: (relations: {
    regression: ExerciseRelationTarget | null;
    progression: ExerciseRelationTarget | null;
  }) => void;
  /** Czy komponent jest disabled */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * ProgressionChain - Poziomy łańcuch progresji ("Drabina Progresji")
 *
 * Layout:
 * [Regresja (łatwiej)] ←── [AKTUALNE] ──→ [Progresja (trudniej)]
 *
 * Filozofia:
 * - WIDOCZNA sekcja, nie ukryta w collapsible
 * - Puste sloty jako "Ghost CTA" - zachęcają do akcji
 * - Dwukierunkowe relacje - ustawienie A→B automatycznie tworzy B→A
 * - Walidacja poziomów trudności
 */
export function ProgressionChain({
  exercise,
  onRelationsChange,
  disabled = false,
  className,
  "data-testid": testId,
}: ProgressionChainProps) {
  // Local state
  const [localRegression, setLocalRegression] = useState<ExerciseRelationTarget | null>(null);
  const [localProgression, setLocalProgression] = useState<ExerciseRelationTarget | null>(null);
  const [isRegressionSearchOpen, setIsRegressionSearchOpen] = useState(false);
  const [isProgressionSearchOpen, setIsProgressionSearchOpen] = useState(false);

  // Fetch existing relationships
  const { data: relationsData, loading: relationsLoading, error: relationsError, refetch } = useQuery<GetExerciseRelationshipsResponse>(
    GET_EXERCISE_RELATIONSHIPS_QUERY,
    {
      variables: { exerciseId: exercise.id },
      skip: !exercise.id,
      fetchPolicy: "cache-and-network",
    }
  );

  // Handle relationships data
  useEffect(() => {
    if (relationsData?.exerciseRelationships) {
      const rels = relationsData.exerciseRelationships;
      const regressionTarget = rels.regression?.targetExercise || null;
      const progressionTarget = rels.progression?.targetExercise || null;
      setLocalRegression(regressionTarget);
      setLocalProgression(progressionTarget);
      onRelationsChange?.({
        regression: regressionTarget,
        progression: progressionTarget,
      });
    }
  }, [relationsData, onRelationsChange]);

  // Log errors silently
  useEffect(() => {
    if (relationsError) {
      console.debug("Relationships query:", relationsError.message);
    }
  }, [relationsError]);

  // Mutations
  const [setRelation, { loading: setRelationLoading }] = useMutation(
    SET_EXERCISE_RELATION_MUTATION,
    {
      onError: (error) => {
        toast.error(`Nie udało się ustawić relacji: ${error.message}`);
      },
    }
  );

  const [removeRelation, { loading: removeRelationLoading }] = useMutation(
    REMOVE_EXERCISE_RELATION_MUTATION,
    {
      onError: (error) => {
        toast.error(`Nie udało się usunąć relacji: ${error.message}`);
      },
    }
  );

  const isLoading = relationsLoading || setRelationLoading || removeRelationLoading;

  // Validation warnings
  const getRegressionWarning = useCallback(() => {
    if (!localRegression?.difficultyLevel || !exercise.difficultyLevel) return null;
    const currentLevel = DIFFICULTY_ORDER[exercise.difficultyLevel] || 3;
    const regressionLevel = DIFFICULTY_ORDER[localRegression.difficultyLevel] || 3;
    if (regressionLevel >= currentLevel) {
      return "Regresja powinna być łatwiejsza";
    }
    return null;
  }, [localRegression, exercise.difficultyLevel]);

  const getProgressionWarning = useCallback(() => {
    if (!localProgression?.difficultyLevel || !exercise.difficultyLevel) return null;
    const currentLevel = DIFFICULTY_ORDER[exercise.difficultyLevel] || 3;
    const progressionLevel = DIFFICULTY_ORDER[localProgression.difficultyLevel] || 3;
    if (progressionLevel <= currentLevel) {
      return "Progresja powinna być trudniejsza";
    }
    return null;
  }, [localProgression, exercise.difficultyLevel]);

  // Handlers
  const handleSetRegression = useCallback(
    async (target: ExerciseRelationTarget) => {
      const previousValue = localRegression;
      setLocalRegression(target);
      onRelationsChange?.({ regression: target, progression: localProgression });

      try {
        await setRelation({
          variables: {
            sourceExerciseId: exercise.id,
            targetExerciseId: target.id,
            relationType: "REGRESSION",
          },
        });
        toast.success("Regresja ustawiona");
      } catch {
        setLocalRegression(previousValue);
        onRelationsChange?.({ regression: previousValue, progression: localProgression });
      }
    },
    [exercise.id, setRelation, localRegression, localProgression, onRelationsChange]
  );

  const handleSetProgression = useCallback(
    async (target: ExerciseRelationTarget) => {
      const previousValue = localProgression;
      setLocalProgression(target);
      onRelationsChange?.({ regression: localRegression, progression: target });

      try {
        await setRelation({
          variables: {
            sourceExerciseId: exercise.id,
            targetExerciseId: target.id,
            relationType: "PROGRESSION",
          },
        });
        toast.success("Progresja ustawiona");
      } catch {
        setLocalProgression(previousValue);
        onRelationsChange?.({ regression: localRegression, progression: previousValue });
      }
    },
    [exercise.id, setRelation, localRegression, localProgression, onRelationsChange]
  );

  const handleRemoveRegression = useCallback(async () => {
    const previousValue = localRegression;
    setLocalRegression(null);
    onRelationsChange?.({ regression: null, progression: localProgression });

    try {
      await removeRelation({
        variables: {
          sourceExerciseId: exercise.id,
          relationType: "REGRESSION",
        },
      });
      toast.success("Regresja usunięta");
    } catch {
      setLocalRegression(previousValue);
      onRelationsChange?.({ regression: previousValue, progression: localProgression });
    }
  }, [exercise.id, removeRelation, localRegression, localProgression, onRelationsChange]);

  const handleRemoveProgression = useCallback(async () => {
    const previousValue = localProgression;
    setLocalProgression(null);
    onRelationsChange?.({ regression: localRegression, progression: null });

    try {
      await removeRelation({
        variables: {
          sourceExerciseId: exercise.id,
          relationType: "PROGRESSION",
        },
      });
      toast.success("Progresja usunięta");
    } catch {
      setLocalProgression(previousValue);
      onRelationsChange?.({ regression: localRegression, progression: previousValue });
    }
  }, [exercise.id, removeRelation, localRegression, localProgression, onRelationsChange]);

  const regressionWarning = getRegressionWarning();
  const progressionWarning = getProgressionWarning();

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)} data-testid={testId}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Ścieżka Rozwoju</span>
            {(regressionWarning || progressionWarning) && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Sprawdź poziomy trudności</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCcw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Chain layout */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Regression Slot */}
          <ExerciseSearchPopover
            currentExerciseId={exercise.id}
            relationType="regression"
            onSelect={handleSetRegression}
            open={isRegressionSearchOpen}
            onOpenChange={setIsRegressionSearchOpen}
          >
            <div>
              <RelationSlot
                type="regression"
                relation={localRegression}
                onSwap={() => setIsRegressionSearchOpen(true)}
                onRemove={handleRemoveRegression}
                warning={regressionWarning}
                disabled={disabled || isLoading}
                isLoading={isLoading}
              />
            </div>
          </ExerciseSearchPopover>

          {/* Arrows and Current Exercise */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />

            {/* Current Exercise Card */}
            <div className="flex flex-col items-center px-2 sm:px-4 py-2 bg-primary/10 rounded-lg border-2 border-primary/30 min-w-[80px] sm:min-w-[100px]">
              <Badge variant="outline" className="text-[9px] mb-1 border-primary/40 text-primary">
                Aktualne
              </Badge>
              <span className="text-xs font-medium text-foreground text-center line-clamp-2 max-w-[80px] sm:max-w-[100px]">
                {exercise.name}
              </span>
              {exercise.difficultyLevel && (
                <Badge variant="secondary" className="text-[9px] mt-1">
                  {exercise.difficultyLevel}
                </Badge>
              )}
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Progression Slot */}
          <ExerciseSearchPopover
            currentExerciseId={exercise.id}
            relationType="progression"
            onSelect={handleSetProgression}
            open={isProgressionSearchOpen}
            onOpenChange={setIsProgressionSearchOpen}
          >
            <div>
              <RelationSlot
                type="progression"
                relation={localProgression}
                onSwap={() => setIsProgressionSearchOpen(true)}
                onRemove={handleRemoveProgression}
                warning={progressionWarning}
                disabled={disabled || isLoading}
                isLoading={isLoading}
              />
            </div>
          </ExerciseSearchPopover>
        </div>

        {/* Info text */}
        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Relacje są dwukierunkowe - ustawienie tutaj automatycznie ustawi relację w powiązanym ćwiczeniu
        </p>
      </div>
    </TooltipProvider>
  );
}

// ============================================
// RelationSlot - Individual slot (filled or ghost)
// ============================================

interface RelationSlotProps {
  type: "regression" | "progression";
  relation: ExerciseRelationTarget | null;
  onSwap: () => void;
  onRemove: () => void;
  warning?: string | null;
  disabled?: boolean;
  isLoading?: boolean;
}

function RelationSlot({
  type,
  relation,
  onSwap,
  onRemove,
  warning,
  disabled = false,
  isLoading = false,
}: RelationSlotProps) {
  const isRegression = type === "regression";
  const label = isRegression ? "Łatwiejsza wersja" : "Trudniejsza wersja";
  const emptyLabel = isRegression ? "+ Dodaj łatwiejszą" : "+ Dodaj trudniejszą";

  // Ghost slot (empty)
  if (!relation) {
    return (
      <button
        onClick={onSwap}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center",
          "w-[80px] sm:w-[100px] h-[80px] sm:h-[100px]",
          "rounded-lg border-2 border-dashed",
          "transition-all cursor-pointer",
          isRegression
            ? "border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5"
            : "border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        data-testid={`progression-chain-${type}-ghost`}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Plus className={cn(
              "h-5 w-5 mb-1",
              isRegression ? "text-blue-500" : "text-emerald-500"
            )} />
            <span className={cn(
              "text-[10px] text-center px-1",
              isRegression ? "text-blue-600" : "text-emerald-600"
            )}>
              {emptyLabel}
            </span>
          </>
        )}
      </button>
    );
  }

  // Filled slot
  const thumbnailUrl = getMediaUrl(relation.thumbnailUrl || relation.gifUrl);

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center",
        "w-[80px] sm:w-[100px]",
        "rounded-lg border bg-surface overflow-hidden",
        warning ? "border-amber-500/50" : "border-border/60",
        "transition-all"
      )}
      data-testid={`progression-chain-${type}-filled`}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-[50px] sm:h-[60px] bg-muted overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={relation.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* AI suggested badge */}
        {relation.isAISuggested && (
          <Badge className="absolute top-1 left-1 text-[8px] px-1 py-0 bg-amber-500/90">
            AI
          </Badge>
        )}

        {/* Warning indicator */}
        {warning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1 right-1 p-0.5 bg-amber-500 rounded-full">
                <AlertTriangle className="h-2.5 w-2.5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{warning}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); onSwap(); }}
            disabled={disabled}
          >
            <RefreshCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-destructive/50"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-1.5 w-full">
        <p className="text-[10px] font-medium text-foreground text-center line-clamp-1">
          {relation.name}
        </p>
        {relation.difficultyLevel && (
          <Badge
            variant="outline"
            className={cn(
              "text-[8px] mt-0.5 w-full justify-center",
              isRegression ? "border-blue-500/30 text-blue-600" : "border-emerald-500/30 text-emerald-600"
            )}
          >
            {relation.difficultyLevel}
          </Badge>
        )}
      </div>
    </div>
  );
}
