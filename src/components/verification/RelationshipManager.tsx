"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GitBranch,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RelationSlot } from "./RelationSlot";
import { ExerciseSearchPopover } from "./ExerciseSearchPopover";
import {
  GET_EXERCISE_RELATIONSHIPS_QUERY,
  GET_RELATION_CANDIDATES_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  SET_EXERCISE_RELATION_MUTATION,
  REMOVE_EXERCISE_RELATION_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type {
  AdminExercise,
  ExerciseRelationTarget,
  DifficultyLevel,
} from "@/graphql/types/adminExercise.types";

// Difficulty level order for validation
const DIFFICULTY_ORDER: Record<string, number> = {
  BEGINNER: 1,
  Beginner: 1,
  EASY: 2,
  Easy: 2,
  MEDIUM: 3,
  Medium: 3,
  HARD: 4,
  Hard: 4,
  EXPERT: 5,
  Expert: 5,
};

interface RelationshipManagerProps {
  /** Aktualne ćwiczenie */
  exercise: AdminExercise;
  /** Callback gdy relacje się zmienią (dla parent component) */
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
 * RelationshipManager - "Drabina Progresji" (Progression Ladder)
 *
 * Wizualizacja:
 * [ ⏪ Regresja (Łatwiej) ] ---- [ 🎯 AKTUALNE ] ---- [ Progresja (Trudniej) ⏩ ]
 *
 * Funkcje:
 * - AI-suggested relations (based on DifficultyLevel)
 * - Bidirectional linking (A->B implies B->A inverse)
 * - Difficulty level validation
 * - Inline editing with Smart Search
 *
 * Integracja:
 * - Relacje zapisywane przy Approve (batch)
 * - Buduje "FiziYo Knowledge Graph"
 */
export function RelationshipManager({
  exercise,
  onRelationsChange,
  disabled = false,
  className,
  "data-testid": testId,
}: RelationshipManagerProps) {
  // Local state - now using ExerciseRelationTarget directly (flat structure)
  const [localRegression, setLocalRegression] = useState<ExerciseRelationTarget | null>(null);
  const [localProgression, setLocalProgression] = useState<ExerciseRelationTarget | null>(null);
  const [isRegressionSearchOpen, setIsRegressionSearchOpen] = useState(false);
  const [isProgressionSearchOpen, setIsProgressionSearchOpen] = useState(false);

  // Fetch existing relationships
  const { data: relationsData, loading: relationsLoading, refetch } = useQuery(
    GET_EXERCISE_RELATIONSHIPS_QUERY,
    {
      variables: { exerciseId: exercise.id },
      skip: !exercise.id,
      fetchPolicy: "cache-and-network",
      onCompleted: (data) => {
        const rels = data?.exerciseRelationships;
        if (rels) {
          setLocalRegression(rels.regression || null);
          setLocalProgression(rels.progression || null);
        }
      },
      onError: (error) => {
        console.error("Error fetching relationships:", error);
        // Don't show toast for expected "field not found" errors during development
      },
    }
  );

  // Fetch AI candidates for empty slots
  const { data: regressionCandidates, loading: regressionCandidatesLoading } = useQuery(
    GET_RELATION_CANDIDATES_QUERY,
    {
      variables: {
        exerciseId: exercise.id,
        relationType: "REGRESSION",
        limit: 3,
      },
      skip: !exercise.id || !!localRegression,
      fetchPolicy: "cache-first",
    }
  );

  const { data: progressionCandidates, loading: progressionCandidatesLoading } = useQuery(
    GET_RELATION_CANDIDATES_QUERY,
    {
      variables: {
        exerciseId: exercise.id,
        relationType: "PROGRESSION",
        limit: 3,
      },
      skip: !exercise.id || !!localProgression,
      fetchPolicy: "cache-first",
    }
  );

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

  // Auto-fill first AI suggestion for empty regression slot
  useEffect(() => {
    if (!localRegression && regressionCandidates?.relationCandidates?.candidates?.[0]) {
      const candidate = regressionCandidates.relationCandidates.candidates[0];
      setLocalRegression({
        id: candidate.id,
        name: candidate.name,
        thumbnailUrl: candidate.thumbnailUrl,
        gifUrl: candidate.gifUrl,
        difficultyLevel: candidate.difficultyLevel,
        isAISuggested: true,
        isVerified: false,
      });
    }
  }, [regressionCandidates, localRegression]);

  // Auto-fill first AI suggestion for empty progression slot
  useEffect(() => {
    if (!localProgression && progressionCandidates?.relationCandidates?.candidates?.[0]) {
      const candidate = progressionCandidates.relationCandidates.candidates[0];
      setLocalProgression({
        id: candidate.id,
        name: candidate.name,
        thumbnailUrl: candidate.thumbnailUrl,
        gifUrl: candidate.gifUrl,
        difficultyLevel: candidate.difficultyLevel,
        isAISuggested: true,
        isVerified: false,
      });
    }
  }, [progressionCandidates, localProgression]);

  // Notify parent of changes
  useEffect(() => {
    onRelationsChange?.({
      regression: localRegression,
      progression: localProgression,
    });
  }, [localRegression, localProgression, onRelationsChange]);

  // Validate difficulty levels
  const regressionWarning = useMemo(() => {
    if (!localRegression?.difficultyLevel || !exercise.difficultyLevel) {
      return null;
    }
    const currentLevel = DIFFICULTY_ORDER[exercise.difficultyLevel] || 3;
    const regressionLevel = DIFFICULTY_ORDER[localRegression.difficultyLevel] || 3;

    if (regressionLevel >= currentLevel) {
      return "Regresja powinna być łatwiejsza";
    }
    return null;
  }, [localRegression, exercise.difficultyLevel]);

  const progressionWarning = useMemo(() => {
    if (!localProgression?.difficultyLevel || !exercise.difficultyLevel) {
      return null;
    }
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
      // Optimistic update
      const previousValue = localRegression;
      setLocalRegression({
        ...target,
        isAISuggested: false,
        isVerified: true,
      });

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
        // Rollback on error
        setLocalRegression(previousValue);
      }
    },
    [exercise.id, setRelation, localRegression]
  );

  const handleSetProgression = useCallback(
    async (target: ExerciseRelationTarget) => {
      // Optimistic update
      const previousValue = localProgression;
      setLocalProgression({
        ...target,
        isAISuggested: false,
        isVerified: true,
      });

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
        // Rollback on error
        setLocalProgression(previousValue);
      }
    },
    [exercise.id, setRelation, localProgression]
  );

  const handleRemoveRegression = useCallback(async () => {
    const previousValue = localRegression;
    setLocalRegression(null);

    try {
      await removeRelation({
        variables: {
          sourceExerciseId: exercise.id,
          relationType: "REGRESSION",
        },
      });
      toast.success("Regresja usunięta");
    } catch {
      // Rollback on error
      setLocalRegression(previousValue);
    }
  }, [exercise.id, removeRelation, localRegression]);

  const handleRemoveProgression = useCallback(async () => {
    const previousValue = localProgression;
    setLocalProgression(null);

    try {
      await removeRelation({
        variables: {
          sourceExerciseId: exercise.id,
          relationType: "PROGRESSION",
        },
      });
      toast.success("Progresja usunięta");
    } catch {
      // Rollback on error
      setLocalProgression(previousValue);
    }
  }, [exercise.id, removeRelation, localProgression]);

  const isLoading = relationsLoading || setRelationLoading || removeRelationLoading;

  return (
    <Card className={cn("border-border/60", className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Ścieżka Rozwoju (Graf)
          </span>
          <div className="flex items-center gap-2">
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">
                    Połącz ćwiczenia w logiczne ścieżki. Gdy pacjent zgłosi "za trudne",
                    aplikacja automatycznie zaproponuje regresję.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progression Ladder */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* REGRESSION SLOT */}
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
                exercise={localRegression}
                onSwap={() => setIsRegressionSearchOpen(true)}
                onRemove={handleRemoveRegression}
                disabled={disabled || isLoading}
                isLoading={regressionCandidatesLoading}
                warning={regressionWarning}
                data-testid={`${testId}-regression-slot`}
              />
            </div>
          </ExerciseSearchPopover>

          {/* CURRENT EXERCISE (Visual Anchor) */}
          <div className="flex flex-col items-center gap-2 px-4">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              <div className="w-px h-8 bg-border" />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-1 text-[10px]">
                Aktualnie weryfikowane
              </Badge>
              <p className="text-sm font-semibold max-w-[150px] truncate" title={exercise.name}>
                {exercise.name}
              </p>
              {exercise.difficultyLevel && (
                <Badge variant="secondary" className="mt-1 text-[9px]">
                  {exercise.difficultyLevel}
                </Badge>
              )}
            </div>
          </div>

          {/* PROGRESSION SLOT */}
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
                exercise={localProgression}
                onSwap={() => setIsProgressionSearchOpen(true)}
                onRemove={handleRemoveProgression}
                disabled={disabled || isLoading}
                isLoading={progressionCandidatesLoading}
                warning={progressionWarning}
                data-testid={`${testId}-progression-slot`}
              />
            </div>
          </ExerciseSearchPopover>
        </div>

        {/* Info about bidirectional linking */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/40">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <p className="text-[10px] text-muted-foreground text-center">
            Relacje są dwukierunkowe. Ustawienie regresji tutaj automatycznie ustawi progresję w powiązanym ćwiczeniu.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook do pobierania relacji ćwiczenia
 */
export function useExerciseRelationships(exerciseId: string) {
  const { data, loading, error, refetch } = useQuery(
    GET_EXERCISE_RELATIONSHIPS_QUERY,
    {
      variables: { exerciseId },
      skip: !exerciseId,
    }
  );

  return {
    regression: data?.exerciseRelationships?.regression as ExerciseRelationTarget | null,
    progression: data?.exerciseRelationships?.progression as ExerciseRelationTarget | null,
    loading,
    error,
    refetch,
  };
}

/**
 * Eksportuj relacje do zapisu przy Approve
 */
export function getRelationsForApprove(
  regression: ExerciseRelationTarget | null,
  progression: ExerciseRelationTarget | null
): { regressionId: string | null; progressionId: string | null } {
  return {
    regressionId: regression?.id || null,
    progressionId: progression?.id || null,
  };
}
