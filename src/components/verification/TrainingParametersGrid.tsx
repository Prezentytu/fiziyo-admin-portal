"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Timer,
  RotateCcw,
  Dumbbell,
  Gauge,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

// ============================================
// TYPES & OPTIONS
// ============================================

const DIFFICULTY_LEVELS = [
  { value: "BEGINNER", label: "Początkujący" },
  { value: "EASY", label: "Łatwy" },
  { value: "MEDIUM", label: "Średni" },
  { value: "HARD", label: "Trudny" },
  { value: "EXPERT", label: "Ekspert" },
];

interface TrainingParametersGridProps {
  /** Ćwiczenie do edycji */
  exercise: AdminExercise;
  /** Callback przy zmianie pola */
  onFieldChange: (field: string, value: unknown) => Promise<void>;
  /** Callback przy zmianie walidacji */
  onValidityChange?: (isValid: boolean) => void;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * TrainingParametersGrid - Parametry treningowe w czystym grid layout
 *
 * Layout:
 * | Serie *  | Powtórzenia | Czas (s) |
 * | Trudność | Tempo       | Przerwa  |
 */
export function TrainingParametersGrid({
  exercise,
  onFieldChange,
  onValidityChange,
  disabled = false,
  className,
  "data-testid": testId,
}: TrainingParametersGridProps) {
  // Local state for immediate feedback
  const [localSets, setLocalSets] = useState<number | null>(exercise.defaultSets ?? null);
  const [localReps, setLocalReps] = useState<number | null>(exercise.defaultReps ?? null);
  const [localDuration, setLocalDuration] = useState<number | null>(exercise.defaultDuration ?? null);
  const [localRest, setLocalRest] = useState<number | null>(exercise.defaultRestBetweenSets ?? null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Sync with external values
  useEffect(() => {
    setLocalSets(exercise.defaultSets ?? null);
    setLocalReps(exercise.defaultReps ?? null);
    setLocalDuration(exercise.defaultDuration ?? null);
    setLocalRest(exercise.defaultRestBetweenSets ?? null);
  }, [exercise.defaultSets, exercise.defaultReps, exercise.defaultDuration, exercise.defaultRestBetweenSets]);

  // ============================================
  // VALIDATION
  // ============================================

  const isInvalid = (value: number | null) => value === null || value <= 0;

  const validation = useMemo(() => {
    const hasSets = !isInvalid(localSets);
    const hasReps = !isInvalid(localReps);
    const hasDuration = !isInvalid(localDuration);
    const hasVolume = hasReps || hasDuration;

    return {
      isValid: hasSets && hasVolume,
      hasSets,
      hasReps,
      hasDuration,
      hasVolume,
    };
  }, [localSets, localReps, localDuration]);

  // Notify parent about validity changes
  useEffect(() => {
    onValidityChange?.(validation.isValid);
  }, [validation.isValid, onValidityChange]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFieldCommit = useCallback(
    async (field: string, value: number | null) => {
      setSavingField(field);
      try {
        await onFieldChange(field, value);
      } finally {
        setSavingField(null);
      }
    },
    [onFieldChange]
  );

  const handleSetsChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalSets(isNaN(val as number) ? null : val);
  }, []);

  const handleSetsBlur = useCallback(async () => {
    await handleFieldCommit("defaultSets", localSets);
  }, [localSets, handleFieldCommit]);

  const handleRepsChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalReps(isNaN(val as number) ? null : val);
  }, []);

  const handleRepsBlur = useCallback(async () => {
    await handleFieldCommit("defaultReps", localReps);
  }, [localReps, handleFieldCommit]);

  const handleDurationChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalDuration(isNaN(val as number) ? null : val);
  }, []);

  const handleDurationBlur = useCallback(async () => {
    await handleFieldCommit("defaultDuration", localDuration);
  }, [localDuration, handleFieldCommit]);

  const handleRestChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalRest(isNaN(val as number) ? null : val);
  }, []);

  const handleRestBlur = useCallback(async () => {
    await handleFieldCommit("defaultRestBetweenSets", localRest);
  }, [localRest, handleFieldCommit]);

  // Local state for tempo and difficulty
  const [localTempo, setLocalTempo] = useState<string>(exercise.tempo || "");
  const [localDifficulty, setLocalDifficulty] = useState<string>(exercise.difficultyLevel || "");

  // Sync tempo and difficulty with external values
  useEffect(() => {
    setLocalTempo(exercise.tempo || "");
    setLocalDifficulty(exercise.difficultyLevel || "");
  }, [exercise.tempo, exercise.difficultyLevel]);

  const handleTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTempo(e.target.value);
  }, []);

  const handleTempoBlur = useCallback(async () => {
    await onFieldChange("tempo", localTempo || null);
  }, [localTempo, onFieldChange]);

  const handleDifficultyChange = useCallback(async (value: string) => {
    setLocalDifficulty(value);
    await onFieldChange("difficultyLevel", value || null);
  }, [onFieldChange]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)} data-testid={testId}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Dumbbell className="h-4 w-4 text-primary" />
            Parametry Treningowe
          </h3>
          {!validation.isValid && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent className="bg-destructive text-destructive-foreground">
                Uzupełnij: Serie + (Powtórzenia lub Czas)
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Row 1: Volume - Serie, Powtórzenia, Czas */}
        <div className="grid grid-cols-3 gap-4">
          {/* Serie (Wymagane) */}
          <div className="space-y-1.5">
            <Label
              className={cn(
                "text-xs flex items-center gap-1",
                isInvalid(localSets) ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Serie *
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={localSets ?? ""}
              onChange={handleSetsChange}
              onBlur={handleSetsBlur}
              disabled={disabled || savingField === "defaultSets"}
              placeholder="0"
              className={cn(
                "font-mono text-center h-10",
                isInvalid(localSets) && "border-destructive"
              )}
              data-testid="training-grid-sets"
            />
          </div>

          {/* Powtórzenia */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Powtórzenia
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={localReps ?? ""}
              onChange={handleRepsChange}
              onBlur={handleRepsBlur}
              disabled={disabled || savingField === "defaultReps"}
              placeholder="0"
              className="font-mono text-center h-10"
              data-testid="training-grid-reps"
            />
          </div>

          {/* Czas (Sekundy) */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              Czas (s)
            </Label>
            <Input
              type="number"
              min={5}
              max={600}
              step={5}
              value={localDuration ?? ""}
              onChange={handleDurationChange}
              onBlur={handleDurationBlur}
              disabled={disabled || savingField === "defaultDuration"}
              placeholder="0"
              className="font-mono text-center h-10"
              data-testid="training-grid-duration"
            />
          </div>
        </div>

        {/* Row 2: Details - Trudność, Tempo, Przerwa */}
        <div className="grid grid-cols-3 gap-4">
          {/* Trudność */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              Trudność
            </Label>
            <Select
              value={localDifficulty}
              onValueChange={handleDifficultyChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-10" data-testid="training-grid-difficulty">
                <SelectValue placeholder="Wybierz" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tempo */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              Tempo
            </Label>
            <Input
              type="text"
              value={localTempo}
              onChange={handleTempoChange}
              onBlur={handleTempoBlur}
              disabled={disabled}
              placeholder="2-0-2"
              className="font-mono text-center h-10"
              data-testid="training-grid-tempo"
            />
          </div>

          {/* Przerwa */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              Przerwa (s)
            </Label>
            <Input
              type="number"
              min={0}
              max={300}
              step={5}
              value={localRest ?? ""}
              onChange={handleRestChange}
              onBlur={handleRestBlur}
              disabled={disabled || savingField === "defaultRestBetweenSets"}
              placeholder="60"
              className="font-mono text-center h-10"
              data-testid="training-grid-rest"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
