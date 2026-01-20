"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Timer,
  RotateCcw,
  Tag,
  Dumbbell,
  ArrowLeftRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Sub-components
import { InlineEditField, InlineEditSelect } from "./InlineEditField";
import { TagSmartChips } from "./TagSmartChips";
import { ProgressionChain } from "./ProgressionChain";

// New Engineering Grade Components
import { AIAnalysisHeader } from "./AIAnalysisHeader";
import { TrainingParametersGrid } from "./TrainingParametersGrid";
import { DualDescriptionTabs } from "./DualDescriptionTabs";

// Smart Validation Components
import { CompletionBar } from "@/components/shared/CompletionBar";
import { GhostField } from "@/components/shared/GhostField";
import { SmartAccordion } from "@/components/shared/SmartAccordion";
import { useFormCompletion, type FieldConfig } from "@/hooks/useFormCompletion";

import type { AdminExercise, ExerciseRelationTarget } from "@/graphql/types/adminExercise.types";
import type { AIVideoAnalysisResponse } from "@/types/ai.types";

// ============================================
// TYPES & OPTIONS
// ============================================

const EXERCISE_TYPES = [
  { value: "reps", label: "Powtórzenia", icon: <RotateCcw className="h-3.5 w-3.5" /> },
  { value: "time", label: "Czasowe", icon: <Timer className="h-3.5 w-3.5" /> },
  { value: "hold", label: "Izometryczne", icon: <Dumbbell className="h-3.5 w-3.5" /> },
];

const EXERCISE_SIDES = [
  { value: "none", label: "Brak" },
  { value: "left", label: "Lewa" },
  { value: "right", label: "Prawa" },
  { value: "both", label: "Obie" },
  { value: "alternating", label: "Naprzem." },
];

interface VerificationEditorPanelProps {
  /** Ćwiczenie do edycji */
  exercise: AdminExercise;
  /** Callback przy zmianie pola */
  onFieldChange: (field: string, value: unknown) => Promise<void>;
  /** Aktualne tagi główne (local state) */
  mainTags: string[];
  /** Callback przy zmianie tagów głównych */
  onMainTagsChange: (tags: string[]) => Promise<void>;
  /** Aktualne tagi dodatkowe (local state) */
  additionalTags: string[];
  /** Callback przy zmianie tagów dodatkowych */
  onAdditionalTagsChange: (tags: string[]) => Promise<void>;
  /** Callback przy zmianie relacji */
  onRelationsChange?: (relations: {
    regression: ExerciseRelationTarget | null;
    progression: ExerciseRelationTarget | null;
  }) => void;
  /** Callback zwracający dane o completion (do footera) */
  onCompletionChange?: (completion: {
    percentage: number;
    canSaveDraft: boolean;
    canPublish: boolean;
    criticalMissing: string[];
    recommendedMissing: string[];
  }) => void;
  /** Czy pokazać AI Analysis Header */
  showAIHeader?: boolean;
  /** Czy komponent jest disabled */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * VerificationEditorPanel - "Training Design System" Engineering Grade Layout
 *
 * Filozofia "AI First, Human Second":
 * - AI wypełnia parametry, człowiek zatwierdza
 * - Wszystkie 20+ parametrów w czytelnym układzie
 * - Visual cues dla pól wypełnionych przez AI (fioletowa poświata)
 *
 * Struktura (6 stref):
 * A. AI Analysis Header (sticky) - przycisk "AI Auto-Analysis"
 * B. Identity Header - Nazwa + Typ + Strona + Status
 * C. Training Matrix - Grid z parametrami czasowymi
 * D. Dual Description - Zakładki Pacjent/Kliniczny
 * E. Tags (collapsible)
 * F. Relations - Łańcuch progresji
 */
export function VerificationEditorPanel({
  exercise,
  onFieldChange,
  mainTags,
  onMainTagsChange,
  additionalTags,
  onAdditionalTagsChange,
  onRelationsChange,
  onCompletionChange,
  showAIHeader = true,
  disabled = false,
  className,
  "data-testid": testId,
}: VerificationEditorPanelProps) {
  // AI Analysis state
  const [isAIHeaderHidden, setIsAIHeaderHidden] = useState(false);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());
  const [previousValues, setPreviousValues] = useState<Record<string, unknown>>({});

  // Section expansion states
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

  // All tags for description context
  const allTags = useMemo(() => [...mainTags, ...additionalTags], [mainTags, additionalTags]);

  // ============================================
  // SMART VALIDATION - Form Completion
  // ============================================

  const completionFields: FieldConfig[] = useMemo(() => [
    {
      key: 'name',
      label: 'Nazwa',
      weight: 20,
      priority: 'critical',
      isFilled: (exercise.name?.trim().length || 0) >= 2
    },
    {
      key: 'patientDescription',
      label: 'Opis dla pacjenta',
      weight: 20,
      priority: 'recommended',
      isFilled: (exercise.patientDescription?.trim().length || 0) > 10
    },
    {
      key: 'media',
      label: 'Media (wideo/zdjęcie)',
      weight: 15,
      priority: 'recommended',
      isFilled: !!(exercise.videoUrl || exercise.thumbnailUrl || exercise.imageUrl || (exercise.images && exercise.images.length > 0))
    },
    {
      key: 'tags',
      label: 'Kategorie',
      weight: 15,
      priority: 'recommended',
      isFilled: mainTags.length > 0
    },
    {
      key: 'difficultyLevel',
      label: 'Poziom trudności',
      weight: 10,
      priority: 'recommended',
      isFilled: !!exercise.difficultyLevel
    },
    {
      key: 'params',
      label: 'Parametry treningowe',
      weight: 10,
      priority: 'optional',
      isFilled: !!(exercise.defaultSets || exercise.defaultReps || exercise.defaultDuration)
    },
    {
      key: 'tempo',
      label: 'Tempo',
      weight: 5,
      priority: 'optional',
      isFilled: !!exercise.tempo
    },
    {
      key: 'clinicalDescription',
      label: 'Opis kliniczny',
      weight: 5,
      priority: 'optional',
      isFilled: (exercise.clinicalDescription?.trim().length || 0) > 0
    },
  ], [exercise, mainTags]);

  const completion = useFormCompletion(completionFields);

  // Notify parent about completion changes
  useEffect(() => {
    onCompletionChange?.({
      percentage: completion.percentage,
      canSaveDraft: completion.canSaveDraft,
      canPublish: completion.canPublish,
      criticalMissing: completion.criticalMissing,
      recommendedMissing: completion.recommendedMissing,
    });
  }, [completion, onCompletionChange]);

  // Count missing fields for SmartAccordion badges
  const paramsMissingCount = useMemo(() => {
    let count = 0;
    if (!exercise.defaultSets && !exercise.defaultReps && !exercise.defaultDuration) count++;
    if (!exercise.tempo) count++;
    if (!exercise.defaultRestBetweenSets) count++;
    return count;
  }, [exercise]);

  const tagsMissingCount = useMemo(() => {
    return mainTags.length === 0 ? 1 : 0;
  }, [mainTags]);

  // Generic field change handler
  const handleFieldCommit = useCallback(
    (field: string) => async (value: unknown) => {
      await onFieldChange(field, value);
    },
    [onFieldChange]
  );

  // Handle AI analysis completion
  const handleAIAnalysisComplete = useCallback(
    async (result: AIVideoAnalysisResponse) => {
      // Store previous values for undo
      const prevValues: Record<string, unknown> = {};

      // Apply AI suggestions to fields
      const fieldsToUpdate: [string, unknown][] = [];

      if (result.patientDescription && !exercise.patientDescription) {
        prevValues.patientDescription = exercise.patientDescription;
        fieldsToUpdate.push(["patientDescription", result.patientDescription]);
      }
      if (result.tempo && !exercise.tempo) {
        prevValues.tempo = exercise.tempo;
        fieldsToUpdate.push(["tempo", result.tempo]);
      }
      if (result.sets && !exercise.defaultSets) {
        prevValues.defaultSets = exercise.defaultSets;
        fieldsToUpdate.push(["defaultSets", result.sets]);
      }
      if (result.reps && !exercise.defaultReps) {
        prevValues.defaultReps = exercise.defaultReps;
        fieldsToUpdate.push(["defaultReps", result.reps]);
      }
      if (result.duration && !exercise.defaultDuration) {
        prevValues.defaultDuration = exercise.defaultDuration;
        fieldsToUpdate.push(["defaultDuration", result.duration]);
      }
      if (result.restBetweenSets && !exercise.defaultRestBetweenSets) {
        prevValues.defaultRestBetweenSets = exercise.defaultRestBetweenSets;
        fieldsToUpdate.push(["defaultRestBetweenSets", result.restBetweenSets]);
      }
      if (result.restBetweenReps && !exercise.defaultRestBetweenReps) {
        prevValues.defaultRestBetweenReps = exercise.defaultRestBetweenReps;
        fieldsToUpdate.push(["defaultRestBetweenReps", result.restBetweenReps]);
      }
      if (result.preparationTime && !exercise.preparationTime) {
        prevValues.preparationTime = exercise.preparationTime;
        fieldsToUpdate.push(["preparationTime", result.preparationTime]);
      }
      if (result.executionTime && !exercise.defaultExecutionTime) {
        prevValues.defaultExecutionTime = exercise.defaultExecutionTime;
        fieldsToUpdate.push(["defaultExecutionTime", result.executionTime]);
      }
      if (result.difficultyLevel && !exercise.difficultyLevel) {
        prevValues.difficultyLevel = exercise.difficultyLevel;
        fieldsToUpdate.push(["difficultyLevel", result.difficultyLevel]);
      }

      setPreviousValues(prevValues);

      // Update fields sequentially
      for (const [field, value] of fieldsToUpdate) {
        try {
          await onFieldChange(field, value);
        } catch (error) {
          console.error(`Failed to update field ${field}:`, error);
        }
      }

      // Mark fields as AI-suggested
      setAiSuggestedFields(new Set(result.updatedFields));
    },
    [exercise, onFieldChange]
  );

  // Handle AI analysis undo
  const handleAIAnalysisUndo = useCallback(async () => {
    // Restore previous values
    for (const [field, value] of Object.entries(previousValues)) {
      try {
        await onFieldChange(field, value);
      } catch (error) {
        console.error(`Failed to restore field ${field}:`, error);
      }
    }

    setPreviousValues({});
    setAiSuggestedFields(new Set());
  }, [previousValues, onFieldChange]);

  // Handle AI field touch (remove suggestion styling)
  const handleAiFieldTouched = useCallback((field: string) => {
    setAiSuggestedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  // Get description value for tags context
  const descriptionValue = exercise.patientDescription || exercise.description || "";

  return (
    <TooltipProvider>
      <div
        className={cn("flex flex-col h-full", className)}
        data-testid={testId}
      >
        {/* ============================================ */}
        {/* STREFA 0: Completion Bar (Smart Validation) */}
        {/* ============================================ */}
        <div className="mb-3 shrink-0" data-testid="verification-completion-section">
          <CompletionBar
            percentage={completion.percentage}
            colorStatus={completion.colorStatus}
            criticalMissing={completion.criticalMissing}
            recommendedMissing={completion.recommendedMissing}
            showMilestones={false}
          />
        </div>

        {/* ============================================ */}
        {/* STREFA A: AI Analysis Header (sticky) */}
        {/* ============================================ */}
        {showAIHeader && (
          <AIAnalysisHeader
            exercise={exercise}
            onAIAnalysisComplete={handleAIAnalysisComplete}
            onAIAnalysisUndo={handleAIAnalysisUndo}
            aiFieldsCount={aiSuggestedFields.size}
            disabled={disabled}
            hidden={isAIHeaderHidden}
            onHide={() => setIsAIHeaderHidden(true)}
            className="mb-3 shrink-0"
            data-testid="verification-editor-ai-header"
          />
        )}

        {/* ============================================ */}
        {/* STREFA B: Identity Header - Name + Type + Side + Status */}
        {/* ============================================ */}
        <div className="flex items-start justify-between gap-2 mb-3 shrink-0" data-testid="verification-editor-header">
          <div className="flex-1 min-w-0">
            <InlineEditField
              value={exercise.name}
              onCommit={handleFieldCommit("name")}
              type="text"
              placeholder="Nazwa ćwiczenia..."
              disabled={disabled}
              variant="ghost"
              className="text-lg font-bold -ml-1.5"
              data-testid="verification-editor-name"
            />

            {/* Type & Side badges */}
            <div className="flex items-center gap-2 mt-1">
              <InlineEditSelect
                value={exercise.type || "reps"}
                onCommit={handleFieldCommit("type")}
                options={EXERCISE_TYPES}
                disabled={disabled}
                variant="ghost"
                size="compact"
                data-testid="verification-editor-type"
              />
              <InlineEditSelect
                value={exercise.side || "none"}
                onCommit={handleFieldCommit("side")}
                options={EXERCISE_SIDES.map(s => ({ ...s, icon: <ArrowLeftRight className="h-3 w-3" /> }))}
                disabled={disabled}
                variant="ghost"
                size="compact"
                data-testid="verification-editor-side"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                exercise.status === "PENDING_REVIEW"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {exercise.status === "PENDING_REVIEW" ? "Oczekuje" : exercise.status}
            </Badge>

            {/* Author tooltip */}
            {exercise.createdBy && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {(exercise.createdBy.fullname || exercise.createdBy.email || "?")[0].toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Autor: {exercise.createdBy.fullname || exercise.createdBy.email}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* STREFA C: Training Matrix Grid (SmartAccordion) */}
        {/* ============================================ */}
        <SmartAccordion
          title="Parametry Treningowe"
          icon={Dumbbell}
          optionalMissing={paramsMissingCount}
          open={isParamsExpanded}
          onOpenChange={setIsParamsExpanded}
          className="mb-3 shrink-0"
          testId="verification-params-accordion"
        >
          <TrainingParametersGrid
            exercise={exercise}
            onFieldChange={onFieldChange}
            aiSuggestedFields={aiSuggestedFields}
            onAiFieldTouched={handleAiFieldTouched}
            disabled={disabled}
            data-testid="verification-editor-training-grid"
          />
        </SmartAccordion>

        {/* ============================================ */}
        {/* STREFA D: Dual Description Tabs + GhostField */}
        {/* ============================================ */}
        {/* GhostField for empty patient description */}
        {!exercise.patientDescription && (
          <div className="mb-3 shrink-0">
            <GhostField
              type="description"
              label="Wygeneruj opis dla pacjenta"
              description="AI napisze zrozumiały opis techniki wykonania ćwiczenia"
              onManualAdd={() => {}}
              hasAI={true}
              testId="verification-ghost-description"
            />
          </div>
        )}

        <DualDescriptionTabs
          patientDescription={exercise.patientDescription || null}
          clinicalDescription={exercise.clinicalDescription || null}
          onFieldChange={onFieldChange}
          exerciseTags={allTags}
          aiSuggestedFields={aiSuggestedFields}
          onAiFieldTouched={handleAiFieldTouched}
          disabled={disabled}
          className="flex-1 min-h-0 mb-3"
          data-testid="verification-editor-descriptions"
        />

        {/* ============================================ */}
        {/* STREFA E: TAGS - SmartAccordion */}
        {/* ============================================ */}
        <SmartAccordion
          title={`Tagi (${mainTags.length + additionalTags.length})`}
          icon={Tag}
          recommendedMissing={tagsMissingCount}
          open={isTagsExpanded}
          onOpenChange={setIsTagsExpanded}
          className="mb-3 shrink-0"
          testId="verification-tags-accordion"
        >
          <div className="space-y-3">
            {/* GhostField when no main tags */}
            {mainTags.length === 0 ? (
              <GhostField
                type="tags"
                label="Zasugeruj tagi AI"
                description="Automatycznie przypisz kategorie na podstawie nazwy i opisu"
                onManualAdd={() => {}}
                hasAI={true}
                testId="verification-ghost-tags"
              />
            ) : (
              <TagSmartChips
                exerciseId={exercise.id}
                exerciseName={exercise.name}
                exerciseDescription={descriptionValue}
                tags={mainTags}
                onTagsChange={onMainTagsChange}
                tagType="main"
                label="Główne"
                disabled={disabled}
                data-testid="verification-editor-main-tags"
              />
            )}

            <TagSmartChips
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              exerciseDescription={descriptionValue}
              tags={additionalTags}
              onTagsChange={onAdditionalTagsChange}
              tagType="additional"
              label="Dodatkowe"
              disabled={disabled}
              data-testid="verification-editor-additional-tags"
            />
          </div>
        </SmartAccordion>

        {/* Inline tag preview when collapsed */}
        {!isTagsExpanded && (mainTags.length > 0 || additionalTags.length > 0) && (
          <div className="flex flex-wrap gap-1 -mt-2 mb-3 px-1">
            {[...mainTags, ...additionalTags].slice(0, 6).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
            {mainTags.length + additionalTags.length > 6 && (
              <span className="text-[10px] text-muted-foreground">
                +{mainTags.length + additionalTags.length - 6}
              </span>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* STREFA F: RELATIONS - Horizontal chain */}
        {/* ============================================ */}
        <div className="shrink-0 pt-2 border-t border-border/40" data-testid="verification-editor-relations">
          <ProgressionChain
            exercise={exercise}
            onRelationsChange={onRelationsChange}
            disabled={disabled}
            data-testid="verification-editor-progression"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
