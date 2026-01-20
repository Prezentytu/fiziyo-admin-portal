"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { FileText, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Sub-components
import { VerificationStickyHeader } from "./VerificationStickyHeader";
import { TagSmartChips } from "./TagSmartChips";
import { DualDescriptionTabs } from "./DualDescriptionTabs";
import { TrainingParametersGrid } from "./TrainingParametersGrid";

import type { AdminExercise, ExerciseRelationTarget } from "@/graphql/types/adminExercise.types";

// ============================================
// TYPES
// ============================================

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
  /** Callback zwracający dane o walidacji (do footera) */
  onValidationChange?: (isValid: boolean, missingFields: string[]) => void;
  /** Callback zwracający dane o completion (legacy - do footera) */
  onCompletionChange?: (completion: {
    percentage: number;
    canSaveDraft: boolean;
    canPublish: boolean;
    criticalMissing: string[];
    recommendedMissing: string[];
  }) => void;
  /** Czy komponent jest disabled */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * VerificationEditorPanel - Clean Cockpit Layout with Smart Tabs
 *
 * Filozofia "Clean Cockpit":
 * - 2 główne taby: Merytoryka (opisy) | Klinika (parametry + tagi)
 * - Smart Tabs z Notification Dots (czerwona kropka gdy brakuje danych)
 * - Sticky header z nazwą, statusem i autorem
 * - Walidacja wizualna - ekspert widzi co trzeba uzupełnić
 *
 * Workflow eksperta:
 * 1. Sprawdź opisy (Tab Merytoryka)
 * 2. Sprawdź parametry i tagi (Tab Klinika)
 * 3. Zatwierdź lub odrzuć
 */
export function VerificationEditorPanel({
  exercise,
  onFieldChange,
  mainTags,
  onMainTagsChange,
  additionalTags,
  onAdditionalTagsChange,
  onRelationsChange,
  onValidationChange,
  onCompletionChange,
  disabled = false,
  className,
  "data-testid": testId,
}: VerificationEditorPanelProps) {
  // ============================================
  // VALIDATION STATE
  // ============================================
  const [isContentValid, setIsContentValid] = useState(false);
  const [isDataValid, setIsDataValid] = useState(false);

  // ============================================
  // VALIDATION LOGIC
  // ============================================

  // Content validation (Tab Merytoryka)
  const contentValidation = useMemo(() => {
    const patientDescLength = (exercise.patientDescription || "").trim().length;
    const clinicalDescLength = (exercise.clinicalDescription || "").trim().length;

    const isPatientDescValid = patientDescLength >= 50;
    const isClinicalDescValid = clinicalDescLength >= 20;

    return {
      isValid: isPatientDescValid && isClinicalDescValid,
      patientDescLength,
      clinicalDescLength,
      isPatientDescValid,
      isClinicalDescValid,
    };
  }, [exercise.patientDescription, exercise.clinicalDescription]);

  // Data validation (Tab Klinika)
  const dataValidation = useMemo(() => {
    const hasSets = (exercise.defaultSets ?? 0) > 0;
    const hasReps = (exercise.defaultReps ?? 0) > 0;
    const hasDuration = (exercise.defaultDuration ?? 0) > 0;
    const hasVolume = hasReps || hasDuration;
    const hasTags = mainTags.length > 0;

    return {
      isValid: hasSets && hasVolume && hasTags,
      hasSets,
      hasReps,
      hasDuration,
      hasVolume,
      hasTags,
    };
  }, [exercise.defaultSets, exercise.defaultReps, exercise.defaultDuration, mainTags]);

  // Update content validity
  useEffect(() => {
    setIsContentValid(contentValidation.isValid);
  }, [contentValidation.isValid]);

  // Update data validity
  useEffect(() => {
    setIsDataValid(dataValidation.isValid);
  }, [dataValidation.isValid]);

  // Combined missing fields for footer
  const missingFields = useMemo(() => {
    const missing: string[] = [];

    // Content missing
    if (!contentValidation.isPatientDescValid) {
      missing.push("Opis pacjenta (min. 50 znaków)");
    }
    if (!contentValidation.isClinicalDescValid) {
      missing.push("Opis kliniczny (min. 20 znaków)");
    }

    // Data missing
    if (!dataValidation.hasSets) {
      missing.push("Liczba serii");
    }
    if (!dataValidation.hasVolume) {
      missing.push("Powtórzenia lub czas");
    }
    if (!dataValidation.hasTags) {
      missing.push("Kategorie główne");
    }

    // Name validation
    if (!exercise.name?.trim() || exercise.name.trim().length < 2) {
      missing.push("Nazwa ćwiczenia");
    }

    // Media validation
    if (!exercise.videoUrl && !exercise.thumbnailUrl && !exercise.imageUrl && (!exercise.images || exercise.images.length === 0)) {
      missing.push("Media (wideo lub zdjęcie)");
    }

    return missing;
  }, [contentValidation, dataValidation, exercise.name, exercise.videoUrl, exercise.thumbnailUrl, exercise.imageUrl, exercise.images]);

  // Notify parent about validation changes
  useEffect(() => {
    const isValid = missingFields.length === 0;
    onValidationChange?.(isValid, missingFields);
  }, [missingFields, onValidationChange]);

  // Legacy completion callback (backward compatibility)
  useEffect(() => {
    const totalCritical = 6;
    const filledCritical = totalCritical - Math.min(missingFields.length, totalCritical);
    const percentage = Math.round((filledCritical / totalCritical) * 100);

    onCompletionChange?.({
      percentage,
      canSaveDraft: percentage >= 40,
      canPublish: missingFields.length === 0,
      criticalMissing: missingFields,
      recommendedMissing: [],
    });
  }, [missingFields, onCompletionChange]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleContentValidityChange = useCallback((isValid: boolean) => {
    setIsContentValid(isValid);
  }, []);

  const handleDataValidityChange = useCallback((isValid: boolean) => {
    setIsDataValid(isValid);
  }, []);

  // Get description value for tags context
  const descriptionValue = exercise.patientDescription || exercise.description || "";

  return (
    <div
      className={cn("flex flex-col h-full", className)}
      data-testid={testId}
    >
      {/* ============================================ */}
      {/* STICKY HEADER */}
      {/* ============================================ */}
      <VerificationStickyHeader
        exercise={exercise}
        onFieldChange={onFieldChange}
        disabled={disabled}
        className="shrink-0 mb-4"
        data-testid="verification-editor-header"
      />

      {/* ============================================ */}
      {/* SMART TABS WITH NOTIFICATION DOTS */}
      {/* ============================================ */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 shrink-0 mb-4">
          {/* Tab: Opis i Instrukcje */}
          <TabsTrigger
            value="content"
            className="relative gap-2"
            data-testid="verification-tab-content"
          >
            <FileText className="h-4 w-4" />
            Opis i Instrukcje
            {/* Notification Dot */}
            {!isContentValid && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </TabsTrigger>

          {/* Tab: Parametry i Tagi */}
          <TabsTrigger
            value="data"
            className="relative gap-2"
            data-testid="verification-tab-data"
          >
            <Settings2 className="h-4 w-4" />
            Parametry i Tagi
            {/* Notification Dot */}
            {!isDataValid && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB CONTENT: OPIS I INSTRUKCJE */}
        {/* ============================================ */}
        <TabsContent
          value="content"
          className="flex-1 min-h-0 mt-0"
          data-testid="verification-content-tab"
        >
          <DualDescriptionTabs
            patientDescription={exercise.patientDescription || null}
            clinicalDescription={exercise.clinicalDescription || null}
            onFieldChange={onFieldChange}
            onValidityChange={handleContentValidityChange}
            disabled={disabled}
            className="h-full"
          />
        </TabsContent>

        {/* ============================================ */}
        {/* TAB CONTENT: PARAMETRY I TAGI */}
        {/* ============================================ */}
        <TabsContent
          value="data"
          className="flex-1 min-h-0 mt-0 overflow-y-auto"
          data-testid="verification-data-tab"
        >
          <div className="space-y-6">
            {/* Training Parameters Grid */}
            <TrainingParametersGrid
              exercise={exercise}
              onFieldChange={onFieldChange}
              onValidityChange={handleDataValidityChange}
              disabled={disabled}
              data-testid="verification-editor-training-grid"
            />

            {/* Tags Section */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <TagSmartChips
                exerciseId={exercise.id}
                exerciseName={exercise.name}
                exerciseDescription={descriptionValue}
                tags={mainTags}
                onTagsChange={onMainTagsChange}
                tagType="main"
                label="Kategorie główne"
                disabled={disabled}
                data-testid="verification-editor-main-tags"
              />

              {additionalTags.length > 0 && (
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
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
