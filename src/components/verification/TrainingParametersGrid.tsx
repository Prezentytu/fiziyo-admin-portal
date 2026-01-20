"use client";

import { useState, useCallback } from "react";
import {
  Timer,
  RotateCcw,
  Dumbbell,
  Clock,
  Pause,
  Gauge,
  Volume2,
  Zap,
  Hourglass,
} from "lucide-react";
import { ClickableStat } from "./ClickableStat";
import { InlineEditField, InlineEditSelect } from "./InlineEditField";
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
  /** Pola wypełnione przez AI (pokazują fioletową poświatę) */
  aiSuggestedFields?: Set<string>;
  /** Callback gdy użytkownik kliknie w pole AI */
  onAiFieldTouched?: (field: string) => void;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

interface GridCellProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  isAiSuggested?: boolean;
  onFocus?: () => void;
  className?: string;
  "data-testid"?: string;
}

/**
 * GridCell - Pojedyncza komórka w Training Matrix
 */
function GridCell({
  icon,
  label,
  children,
  isAiSuggested,
  onFocus,
  className,
  "data-testid": testId,
}: GridCellProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col p-2.5 rounded-lg border border-border/40 bg-surface/30 transition-all",
        "hover:border-border/60 hover:bg-surface/50",
        isAiSuggested && "ai-suggested",
        className
      )}
      onFocus={onFocus}
      data-testid={testId}
    >
      {/* AI Badge */}
      {isAiSuggested && (
        <div className="ai-suggested-badge">
          <Zap />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex items-center">
        {children}
      </div>
    </div>
  );
}

/**
 * TrainingParametersGrid - Bento Grid z parametrami treningowymi
 *
 * Layout (4 kolumny):
 * | Serie | Powtórzenia | Czas | Tempo |
 * | Przerwa (Serie) | Przerwa (Powt.) | Przygotowanie | Czas wyk. |
 * | Trudność | Audio Cue (colspan 3) |
 */
export function TrainingParametersGrid({
  exercise,
  onFieldChange,
  aiSuggestedFields = new Set(),
  onAiFieldTouched,
  disabled = false,
  className,
  "data-testid": testId,
}: TrainingParametersGridProps) {
  // Track which fields have been touched (to remove AI suggestion styling)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const handleFieldCommit = useCallback(
    (field: string) => async (value: unknown) => {
      await onFieldChange(field, value);
    },
    [onFieldChange]
  );

  const handleFieldFocus = useCallback(
    (field: string) => {
      if (aiSuggestedFields.has(field) && !touchedFields.has(field)) {
        setTouchedFields((prev) => new Set([...prev, field]));
        onAiFieldTouched?.(field);
      }
    },
    [aiSuggestedFields, touchedFields, onAiFieldTouched]
  );

  const isAiSuggested = (field: string) =>
    aiSuggestedFields.has(field) && !touchedFields.has(field);

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid={testId}
    >
      {/* Row 1: Volume & Basic Timing */}
      <div className="grid grid-cols-4 gap-2">
        {/* Serie */}
        <GridCell
          icon={<Dumbbell className="h-3.5 w-3.5" />}
          label="Serie"
          isAiSuggested={isAiSuggested("defaultSets")}
          onFocus={() => handleFieldFocus("defaultSets")}
          data-testid="training-grid-sets-cell"
        >
          <ClickableStat
            value={exercise.defaultSets ?? null}
            label=""
            min={0}
            max={20}
            onCommit={handleFieldCommit("defaultSets")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-sets"
          />
        </GridCell>

        {/* Powtórzenia */}
        <GridCell
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label="Powtórzenia"
          isAiSuggested={isAiSuggested("defaultReps")}
          onFocus={() => handleFieldFocus("defaultReps")}
          data-testid="training-grid-reps-cell"
        >
          <ClickableStat
            value={exercise.defaultReps ?? null}
            label=""
            min={0}
            max={100}
            onCommit={handleFieldCommit("defaultReps")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-reps"
          />
        </GridCell>

        {/* Czas ćwiczenia */}
        <GridCell
          icon={<Timer className="h-3.5 w-3.5" />}
          label="Czas"
          isAiSuggested={isAiSuggested("defaultDuration")}
          onFocus={() => handleFieldFocus("defaultDuration")}
          data-testid="training-grid-duration-cell"
        >
          <ClickableStat
            value={exercise.defaultDuration ?? null}
            label=""
            unit="s"
            min={0}
            max={600}
            step={5}
            onCommit={handleFieldCommit("defaultDuration")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-duration"
          />
        </GridCell>

        {/* Tempo */}
        <GridCell
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Tempo"
          isAiSuggested={isAiSuggested("tempo")}
          onFocus={() => handleFieldFocus("tempo")}
          data-testid="training-grid-tempo-cell"
        >
          <InlineEditField
            value={exercise.tempo || null}
            onCommit={handleFieldCommit("tempo")}
            type="text"
            placeholder="2-0-2"
            disabled={disabled}
            variant="ghost"
            size="compact"
            className="w-full text-center font-mono"
            data-testid="training-grid-tempo"
          />
        </GridCell>
      </div>

      {/* Row 2: Rest Times & Advanced Timing */}
      <div className="grid grid-cols-4 gap-2">
        {/* Przerwa między seriami */}
        <GridCell
          icon={<Pause className="h-3.5 w-3.5" />}
          label="Przerwa (Serie)"
          isAiSuggested={isAiSuggested("defaultRestBetweenSets")}
          onFocus={() => handleFieldFocus("defaultRestBetweenSets")}
          data-testid="training-grid-rest-sets-cell"
        >
          <ClickableStat
            value={exercise.defaultRestBetweenSets ?? null}
            label=""
            unit="s"
            min={0}
            max={300}
            step={5}
            onCommit={handleFieldCommit("defaultRestBetweenSets")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-rest-sets"
          />
        </GridCell>

        {/* Przerwa między powtórzeniami */}
        <GridCell
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Przerwa (Powt.)"
          isAiSuggested={isAiSuggested("defaultRestBetweenReps")}
          onFocus={() => handleFieldFocus("defaultRestBetweenReps")}
          data-testid="training-grid-rest-reps-cell"
        >
          <ClickableStat
            value={exercise.defaultRestBetweenReps ?? null}
            label=""
            unit="s"
            min={0}
            max={60}
            step={1}
            onCommit={handleFieldCommit("defaultRestBetweenReps")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-rest-reps"
          />
        </GridCell>

        {/* Czas przygotowania */}
        <GridCell
          icon={<Hourglass className="h-3.5 w-3.5" />}
          label="Przygotowanie"
          isAiSuggested={isAiSuggested("preparationTime")}
          onFocus={() => handleFieldFocus("preparationTime")}
          data-testid="training-grid-prep-cell"
        >
          <ClickableStat
            value={exercise.preparationTime ?? null}
            label=""
            unit="s"
            min={0}
            max={30}
            step={1}
            onCommit={handleFieldCommit("preparationTime")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-prep"
          />
        </GridCell>

        {/* Czas wykonania (jednego powtórzenia) */}
        <GridCell
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Czas wyk."
          isAiSuggested={isAiSuggested("defaultExecutionTime")}
          onFocus={() => handleFieldFocus("defaultExecutionTime")}
          data-testid="training-grid-exec-cell"
        >
          <ClickableStat
            value={exercise.defaultExecutionTime ?? null}
            label=""
            unit="s"
            min={0}
            max={120}
            step={1}
            onCommit={handleFieldCommit("defaultExecutionTime")}
            disabled={disabled}
            variant="compact"
            className="w-full justify-center"
            data-testid="training-grid-exec"
          />
        </GridCell>
      </div>

      {/* Row 3: Difficulty & Audio */}
      <div className="grid grid-cols-4 gap-2">
        {/* Poziom trudności */}
        <GridCell
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Trudność"
          isAiSuggested={isAiSuggested("difficultyLevel")}
          onFocus={() => handleFieldFocus("difficultyLevel")}
          data-testid="training-grid-difficulty-cell"
        >
          <InlineEditSelect
            value={exercise.difficultyLevel || ""}
            onCommit={handleFieldCommit("difficultyLevel")}
            options={DIFFICULTY_LEVELS}
            placeholder="Wybierz..."
            disabled={disabled}
            variant="ghost"
            size="compact"
            className="w-full"
            data-testid="training-grid-difficulty"
          />
        </GridCell>

        {/* Audio Cue - colspan 3 */}
        <GridCell
          icon={<Volume2 className="h-3.5 w-3.5" />}
          label="Audio Cue"
          isAiSuggested={isAiSuggested("audioCue")}
          onFocus={() => handleFieldFocus("audioCue")}
          className="col-span-3"
          data-testid="training-grid-audio-cell"
        >
          <InlineEditField
            value={exercise.audioCue || null}
            onCommit={handleFieldCommit("audioCue")}
            type="text"
            placeholder="Tekst lektora, np. 'Napnij brzuch, trzymaj proste plecy...'"
            disabled={disabled}
            variant="ghost"
            size="compact"
            className="w-full"
            data-testid="training-grid-audio"
          />
        </GridCell>
      </div>
    </div>
  );
}
