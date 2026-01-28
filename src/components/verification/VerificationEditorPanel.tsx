"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dumbbell,
  RotateCcw,
  Timer,
  Gauge,
  ArrowLeftRight,
  User,
  Stethoscope,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Sub-components
import { VerificationStickyHeader } from "./VerificationStickyHeader";
import { TagSmartChips } from "./TagSmartChips";

import type { AdminExercise, ExerciseRelationTarget } from "@/graphql/types/adminExercise.types";

// ============================================
// CONSTANTS
// ============================================

const DIFFICULTY_LEVELS = [
  { value: "BEGINNER", label: "Początkujący" },
  { value: "EASY", label: "Łatwy" },
  { value: "MEDIUM", label: "Średni" },
  { value: "HARD", label: "Trudny" },
  { value: "EXPERT", label: "Ekspert" },
];

const BODY_SIDES = [
  { value: "NONE", label: "Brak" },
  { value: "LEFT", label: "Lewa" },
  { value: "RIGHT", label: "Prawa" },
  { value: "BOTH", label: "Obie" },
  { value: "ALTERNATING", label: "Naprzemiennie" },
];

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
 * VerificationEditorPanel - Context Switcher Layout (Tier 1/2/3)
 *
 * Filozofia "The Context Switcher":
 * - Tier 1 (Core Metrics): Serie, Powt, Czas, Przerwa - zawsze widoczne, duże
 * - Tier 2 (Property Grid): Tempo, Obciążenie, RPE, Strona - Notion-style grid
 * - Tier 3 (Content Switcher): Zakładki Kliniczny vs Pacjenta - jeden Textarea
 *
 * Korzyści:
 * - Redukcja szumu - nie wyświetlamy obu opisów naraz
 * - Skalowalność - Property Grid elastycznie przyjmuje nowe pola
 * - Profesjonalizm - layout jak w narzędziach inżynierskich
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
  // LOCAL STATE FOR IMMEDIATE FEEDBACK
  // ============================================
  const [localSets, setLocalSets] = useState<number | null>(exercise.defaultSets ?? null);
  const [localReps, setLocalReps] = useState<number | null>(exercise.defaultReps ?? null);
  const [localDuration, setLocalDuration] = useState<number | null>(exercise.defaultDuration ?? null);
  const [localRest, setLocalRest] = useState<number | null>(exercise.defaultRestBetweenSets ?? null);
  const [localTempo, setLocalTempo] = useState<string>(exercise.tempo || "");
  const [localDifficulty, setLocalDifficulty] = useState<string>(exercise.difficultyLevel || "");
  const [localSide, setLocalSide] = useState<string>(exercise.side || "NONE");

  // Description states
  const [localPatientDesc, setLocalPatientDesc] = useState(exercise.patientDescription || "");
  const [localClinicalDesc, setLocalClinicalDesc] = useState(exercise.clinicalDescription || "");
  const [activeDescTab, setActiveDescTab] = useState<"clinical" | "patient">("patient");
  const [isDescSaving, setIsDescSaving] = useState(false);

  // Sync with external values
  useEffect(() => {
    setLocalSets(exercise.defaultSets ?? null);
    setLocalReps(exercise.defaultReps ?? null);
    setLocalDuration(exercise.defaultDuration ?? null);
    setLocalRest(exercise.defaultRestBetweenSets ?? null);
    setLocalTempo(exercise.tempo || "");
    setLocalDifficulty(exercise.difficultyLevel || "");
    setLocalSide(exercise.side || "NONE");
    setLocalPatientDesc(exercise.patientDescription || "");
    setLocalClinicalDesc(exercise.clinicalDescription || "");
  }, [exercise]);

  // ============================================
  // VALIDATION LOGIC
  // ============================================

  const contentValidation = useMemo(() => {
    const patientDescLength = localPatientDesc.trim().length;
    const clinicalDescLength = localClinicalDesc.trim().length;

    return {
      isValid: patientDescLength >= 50 && clinicalDescLength >= 20,
      patientDescLength,
      clinicalDescLength,
      isPatientDescValid: patientDescLength >= 50,
      isClinicalDescValid: clinicalDescLength >= 20,
    };
  }, [localPatientDesc, localClinicalDesc]);

  const dataValidation = useMemo(() => {
    const hasSets = (localSets ?? 0) > 0;
    const hasReps = (localReps ?? 0) > 0;
    const hasDuration = (localDuration ?? 0) > 0;
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
  }, [localSets, localReps, localDuration, mainTags]);

  // Combined missing fields
  const missingFields = useMemo(() => {
    const missing: string[] = [];

    if (!contentValidation.isPatientDescValid) {
      missing.push("Opis pacjenta (min. 50 znaków)");
    }
    if (!contentValidation.isClinicalDescValid) {
      missing.push("Opis kliniczny (min. 20 znaków)");
    }
    if (!dataValidation.hasSets) {
      missing.push("Liczba serii");
    }
    if (!dataValidation.hasVolume) {
      missing.push("Powtórzenia lub czas");
    }
    if (!dataValidation.hasTags) {
      missing.push("Kategorie główne");
    }
    if (!exercise.name?.trim() || exercise.name.trim().length < 2) {
      missing.push("Nazwa ćwiczenia");
    }
    if (!exercise.videoUrl && !exercise.thumbnailUrl && !exercise.imageUrl && (!exercise.images || exercise.images.length === 0)) {
      missing.push("Media (wideo lub zdjęcie)");
    }

    return missing;
  }, [contentValidation, dataValidation, exercise]);

  // Notify parent about validation changes
  useEffect(() => {
    const isValid = missingFields.length === 0;
    onValidationChange?.(isValid, missingFields);
  }, [missingFields, onValidationChange]);

  // Legacy completion callback
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

  const handleNumberBlur = useCallback(
    async (field: string, value: number | null) => {
      await onFieldChange(field, value);
    },
    [onFieldChange]
  );

  const handleSelectChange = useCallback(
    async (field: string, value: string) => {
      await onFieldChange(field, value || null);
    },
    [onFieldChange]
  );

  const handleDescriptionBlur = useCallback(
    async (field: string, value: string) => {
      setIsDescSaving(true);
      try {
        await onFieldChange(field, value || null);
      } finally {
        setIsDescSaving(false);
      }
    },
    [onFieldChange]
  );

  const descriptionValue = exercise.patientDescription || exercise.description || "";

  // ============================================
  // RENDER HELPERS
  // ============================================

  const isInvalid = (value: number | null) => value === null || value <= 0;

  return (
    <TooltipProvider>
      <div
        className={cn("flex flex-col h-full overflow-y-auto", className)}
        data-testid={testId}
      >
        {/* ============================================ */}
        {/* SECTION 1: HEADER (Name + Tags) */}
        {/* ============================================ */}
        <VerificationStickyHeader
          exercise={exercise}
          onFieldChange={onFieldChange}
          disabled={disabled}
          className="shrink-0 mb-4"
          data-testid="verification-editor-header"
        />

        {/* Tags under header */}
        <div className="shrink-0 mb-5">
          <TagSmartChips
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            exerciseDescription={descriptionValue}
            tags={mainTags}
            onTagsChange={onMainTagsChange}
            tagType="main"
            label="Kategorie"
            disabled={disabled}
            data-testid="verification-editor-main-tags"
          />
        </div>

        {/* ============================================ */}
        {/* SECTION 2: CORE METRICS (Tier 1) */}
        {/* ============================================ */}
        <div className="shrink-0 mb-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Dumbbell className="h-3.5 w-3.5 text-primary" />
            Parametry podstawowe
            {!dataValidation.isValid && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent className="bg-destructive text-destructive-foreground">
                  Uzupełnij wymagane pola
                </TooltipContent>
              </Tooltip>
            )}
          </h3>

          {/* Large 4-column grid for core metrics */}
          <div className="grid grid-cols-4 gap-2">
            {/* Serie */}
            <div className="space-y-1">
              <Label className={cn(
                "text-[10px] uppercase tracking-wider text-center block",
                isInvalid(localSets) ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                Serie *
              </Label>
              <div className={cn(
                "relative h-14 rounded-xl transition-all duration-200",
                "bg-zinc-900/50 border",
                isInvalid(localSets) ? "border-destructive/50" : "border-zinc-800",
                "hover:border-zinc-700 focus-within:border-primary/50"
              )}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={localSets ?? ""}
                  onChange={(e) => setLocalSets(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  onBlur={() => handleNumberBlur("defaultSets", localSets)}
                  disabled={disabled}
                  placeholder="0"
                  className="w-full h-full bg-transparent text-xl font-bold text-center outline-none text-foreground placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-sets"
                />
              </div>
            </div>

            {/* Powtórzenia */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-center block text-muted-foreground">
                Powt.
              </Label>
              <div className={cn(
                "relative h-14 rounded-xl transition-all duration-200",
                "bg-zinc-900/50 border border-zinc-800",
                "hover:border-zinc-700 focus-within:border-primary/50",
                localDuration && !localReps && "opacity-40"
              )}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={localReps ?? ""}
                  onChange={(e) => setLocalReps(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  onBlur={() => handleNumberBlur("defaultReps", localReps)}
                  disabled={disabled}
                  placeholder="0"
                  className="w-full h-full bg-transparent text-xl font-bold text-center outline-none text-foreground placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-reps"
                />
              </div>
            </div>

            {/* Czas */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-center block text-muted-foreground">
                Czas
              </Label>
              <div className={cn(
                "relative h-14 rounded-xl transition-all duration-200",
                "bg-zinc-900/50 border border-zinc-800",
                "hover:border-zinc-700 focus-within:border-primary/50",
                localReps && !localDuration && "opacity-40"
              )}>
                <input
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={localDuration ?? ""}
                  onChange={(e) => setLocalDuration(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  onBlur={() => handleNumberBlur("defaultDuration", localDuration)}
                  disabled={disabled}
                  placeholder="—"
                  className="w-full h-full bg-transparent text-xl font-bold text-center outline-none text-foreground placeholder:text-zinc-600 pr-6 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-duration"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                  s
                </span>
              </div>
            </div>

            {/* Przerwa */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-center block text-muted-foreground">
                Przerwa
              </Label>
              <div className={cn(
                "relative h-14 rounded-xl transition-all duration-200",
                "bg-zinc-900/50 border border-zinc-800",
                "hover:border-zinc-700 focus-within:border-primary/50"
              )}>
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={5}
                  value={localRest ?? ""}
                  onChange={(e) => setLocalRest(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  onBlur={() => handleNumberBlur("defaultRestBetweenSets", localRest)}
                  disabled={disabled}
                  placeholder="60"
                  className="w-full h-full bg-transparent text-xl font-bold text-center outline-none text-foreground placeholder:text-zinc-600 pr-6 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-rest"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                  s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SECTION 3: PROPERTY GRID (Tier 2) */}
        {/* ============================================ */}
        <div className="shrink-0 mb-5 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
          <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
            Szczegóły techniczne
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Tempo */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                Tempo
              </Label>
              <Input
                type="text"
                value={localTempo}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setLocalTempo(value);
                }}
                onBlur={() => handleSelectChange("tempo", localTempo)}
                disabled={disabled}
                placeholder="3010"
                className="font-mono text-center h-9 bg-zinc-900/50 border-zinc-800"
                maxLength={4}
                data-testid="property-tempo"
              />
            </div>

            {/* Trudność */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                Trudność
              </Label>
              <Select
                value={localDifficulty}
                onValueChange={(v) => {
                  setLocalDifficulty(v);
                  handleSelectChange("difficultyLevel", v);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 bg-zinc-900/50 border-zinc-800" data-testid="property-difficulty">
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

            {/* Strona ciała */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <ArrowLeftRight className="h-3 w-3" />
                Strona ciała
              </Label>
              <Select
                value={localSide}
                onValueChange={(v) => {
                  setLocalSide(v);
                  handleSelectChange("side", v);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 bg-zinc-900/50 border-zinc-800" data-testid="property-side">
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_SIDES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Obciążenie (placeholder - przyszłe pole) */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell className="h-3 w-3" />
                Obciążenie
              </Label>
              <Input
                type="text"
                placeholder="np. 10kg, RPE 7"
                disabled={disabled}
                className="h-9 bg-zinc-900/50 border-zinc-800"
                data-testid="property-load"
              />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SECTION 4: CONTENT SWITCHER (Tier 3) */}
        {/* ============================================ */}
        <div className="flex-1 min-h-0">
          <Tabs
            value={activeDescTab}
            onValueChange={(v) => setActiveDescTab(v as "clinical" | "patient")}
            className="flex flex-col h-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-9 mb-3 shrink-0">
              <TabsTrigger
                value="patient"
                className={cn(
                  "text-xs gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400",
                  !contentValidation.isPatientDescValid && "text-amber-500"
                )}
                data-testid="desc-tab-patient"
              >
                <User className="h-3.5 w-3.5" />
                Dla Pacjenta
                {!contentValidation.isPatientDescValid && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className={cn(
                  "text-xs gap-1.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400",
                  !contentValidation.isClinicalDescValid && "text-amber-500"
                )}
                data-testid="desc-tab-clinical"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Dla Fizjoterapeuty
                {!contentValidation.isClinicalDescValid && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Patient Description */}
            <TabsContent value="patient" className="flex-1 mt-0">
              <div className={cn(
                "h-full rounded-lg border transition-colors",
                activeDescTab === "patient" ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800"
              )}>
                <Textarea
                  value={localPatientDesc}
                  onChange={(e) => setLocalPatientDesc(e.target.value)}
                  onBlur={() => handleDescriptionBlur("patientDescription", localPatientDesc)}
                  placeholder="Wpisz prosty opis dla pacjenta - jak Pani Jadzia ma wykonać to ćwiczenie..."
                  disabled={disabled || isDescSaving}
                  className={cn(
                    "h-full min-h-[120px] resize-none border-0 bg-transparent",
                    "text-sm leading-relaxed placeholder:text-zinc-600"
                  )}
                  data-testid="desc-patient-textarea"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span>Prosty język zrozumiały dla pacjenta</span>
                <span className={cn(
                  contentValidation.isPatientDescValid ? "text-emerald-500" : "text-amber-500"
                )}>
                  {contentValidation.patientDescLength}/50 znaków
                </span>
              </p>
            </TabsContent>

            {/* Clinical Description */}
            <TabsContent value="clinical" className="flex-1 mt-0">
              <div className={cn(
                "h-full rounded-lg border transition-colors",
                activeDescTab === "clinical" ? "border-blue-500/30 bg-blue-500/5" : "border-zinc-800"
              )}>
                <Textarea
                  value={localClinicalDesc}
                  onChange={(e) => setLocalClinicalDesc(e.target.value)}
                  onBlur={() => handleDescriptionBlur("clinicalDescription", localClinicalDesc)}
                  placeholder="Opis kliniczny: biomechanika, mięśnie aktywowane, wskazania medyczne..."
                  disabled={disabled || isDescSaving}
                  className={cn(
                    "h-full min-h-[120px] resize-none border-0 bg-transparent",
                    "text-sm leading-relaxed placeholder:text-zinc-600"
                  )}
                  data-testid="desc-clinical-textarea"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span>Terminologia medyczna dla specjalistów</span>
                <span className={cn(
                  contentValidation.isClinicalDescValid ? "text-emerald-500" : "text-amber-500"
                )}>
                  {contentValidation.clinicalDescLength}/20 znaków
                </span>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
