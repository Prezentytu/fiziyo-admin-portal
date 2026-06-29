'use client';

import { useState, useCallback, useMemo, useEffect, type ComponentType } from 'react';
import {
  Dumbbell,
  Gauge,
  User,
  Stethoscope,
  AlertCircle,
  ChevronDown,
  Activity,
  ArrowLeftRight,
  Clock,
  FileText,
  PauseCircle,
  Volume2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ExerciseFieldLabelWithTooltip } from '@/features/exercises/ExerciseFieldLabelWithTooltip';
import { EXERCISE_FIELD_TOOLTIPS } from '@/features/exercises/exerciseFieldTooltips';
import {
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  type ExerciseFieldIconKey,
  type ExerciseFieldKey,
} from '@/components/shared/exercise';
import {
  buildDefaultLoadUpdate,
  resolveLoadPreset,
  type LoadPresetKey,
} from '@/features/verification/utils/loadPayload';

// Sub-components
import { VerificationStickyHeader } from './VerificationStickyHeader';
import { TagSmartChips } from './TagSmartChips';
import { EnrichmentEditor } from './EnrichmentEditor';
import { EditorSection } from './EditorSection';

import type { AdminExercise, ExerciseRelationTarget } from '@/graphql/types/adminExercise.types';

// ============================================
// CONSTANTS
// ============================================

const DIFFICULTY_LEVELS = [
  { value: 'BEGINNER', label: 'Początkujący' },
  { value: 'EASY', label: 'Łatwy' },
  { value: 'MEDIUM', label: 'Średni' },
  { value: 'HARD', label: 'Trudny' },
  { value: 'EXPERT', label: 'Ekspert' },
];

const BODY_SIDES = [
  { value: 'NONE', label: 'Brak' },
  { value: 'LEFT', label: 'Lewa' },
  { value: 'RIGHT', label: 'Prawa' },
  { value: 'BOTH', label: 'Obie' },
  { value: 'ALTERNATING', label: 'Naprzemiennie' },
];

const RANGE_OF_MOTION_OPTIONS = [
  { value: 'FULL', label: 'Pełny zakres' },
  { value: 'PARTIAL', label: 'Częściowy zakres' },
  { value: 'ISOMETRIC', label: 'Izometryczny' },
  { value: 'ECCENTRIC', label: 'Ekscentryczny' },
  { value: 'CONCENTRIC', label: 'Koncentryczny' },
];

const EXERCISE_TYPES = [
  { value: 'REPS', label: 'Powtórzenia' },
  { value: 'TIME', label: 'Czas' },
];

const LOAD_PRESETS = [
  { value: 'kg', label: 'Ciężar (kg)' },
  { value: 'lb', label: 'Ciężar (lb)' },
  { value: 'band', label: 'Guma oporowa' },
  { value: 'bodyweight', label: 'Ciężar ciała' },
  { value: 'rpe', label: 'RPE' },
] as const;

const FIELD_ICONS: Record<ExerciseFieldIconKey, ComponentType<{ className?: string }>> = {
  sets: Dumbbell,
  reps: Activity,
  time: Clock,
  pause: PauseCircle,
  tempo: Gauge,
  load: Dumbbell,
  side: ArrowLeftRight,
  range: Gauge,
  difficulty: AlertCircle,
  description: FileText,
  audio: Volume2,
  notes: FileText,
};


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
  'data-testid'?: string;
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
  onRelationsChange: _onRelationsChange,
  onValidationChange,
  onCompletionChange,
  disabled = false,
  className,
  'data-testid': testId,
}: Readonly<VerificationEditorPanelProps>) {
  // ============================================
  // LOCAL STATE FOR IMMEDIATE FEEDBACK
  // ============================================
  const [localSets, setLocalSets] = useState<number | null>(exercise.defaultSets ?? null);
  const [localReps, setLocalReps] = useState<number | null>(exercise.defaultReps ?? null);
  const [localDuration, setLocalDuration] = useState<number | null>(exercise.defaultDuration ?? null);
  const [localRest, setLocalRest] = useState<number | null>(exercise.defaultRestBetweenSets ?? null);
  const [localTempo, setLocalTempo] = useState<string>(exercise.tempo || '');
  const [localType, setLocalType] = useState<string>(exercise.type || 'REPS');
  const [localDifficulty, setLocalDifficulty] = useState<string>(exercise.difficultyLevel || '');
  const [localSide, setLocalSide] = useState<string>(exercise.side || 'NONE');
  const [localAudioCue, setLocalAudioCue] = useState<string>(exercise.audioCue || '');
  const [localNotes, setLocalNotes] = useState<string>(exercise.notes || '');

  // Extended parameters state
  const [localRestBetweenReps, setLocalRestBetweenReps] = useState<number | null>(
    exercise.defaultRestBetweenReps ?? null
  );
  const [localPrepTime, setLocalPrepTime] = useState<number | null>(exercise.preparationTime ?? null);
  const [localExecTime, setLocalExecTime] = useState<number | null>(exercise.defaultExecutionTime ?? null);
  const [localRangeOfMotion, setLocalRangeOfMotion] = useState<string>(exercise.rangeOfMotion || '');
  const [localLoadValue, setLocalLoadValue] = useState<string>(
    exercise.defaultLoad?.value?.toString() || exercise.loadValue?.toString() || ''
  );
  const [localLoadUnit, setLocalLoadUnit] = useState<LoadPresetKey>(resolveLoadPreset(exercise));
  const [localLoadText, setLocalLoadText] = useState<string>(exercise.defaultLoad?.text || exercise.loadText || '');

  // Collapsible state for technical details
  const [isTechnicalOpen, setIsTechnicalOpen] = useState(false);
  const [isEnrichmentOpen, setIsEnrichmentOpen] = useState(false);

  // Track if any technical details have been modified
  const [technicalDetailsModified, setTechnicalDetailsModified] = useState(false);

  // Description states
  const [localPatientDesc, setLocalPatientDesc] = useState(exercise.patientDescription || '');
  const [localClinicalDesc, setLocalClinicalDesc] = useState(exercise.clinicalDescription || '');
  const [activeDescTab, setActiveDescTab] = useState<'clinical' | 'patient'>('patient');
  const [isDescSaving, setIsDescSaving] = useState(false);

  // Sync with external values ONLY when exercise ID changes (new exercise loaded).
  // We intentionally depend only on exercise.id so we don't reset local form state when parent
  // updates other exercise fields (e.g. after save), which would overwrite in-progress edits.
  useEffect(() => {
    setLocalSets(exercise.defaultSets ?? null);
    setLocalReps(exercise.defaultReps ?? null);
    setLocalDuration(exercise.defaultDuration ?? null);
    setLocalRest(exercise.defaultRestBetweenSets ?? null);
    setLocalTempo(exercise.tempo || '');
    setLocalType(exercise.type || 'REPS');
    setLocalDifficulty(exercise.difficultyLevel || '');
    setLocalSide(exercise.side || 'NONE');
    setLocalAudioCue(exercise.audioCue || '');
    setLocalNotes(exercise.notes || '');
    setLocalPatientDesc(exercise.patientDescription || '');
    setLocalClinicalDesc(exercise.clinicalDescription || '');
    setLocalRestBetweenReps(exercise.defaultRestBetweenReps ?? null);
    setLocalPrepTime(exercise.preparationTime ?? null);
    setLocalExecTime(exercise.defaultExecutionTime ?? null);
    setLocalRangeOfMotion(exercise.rangeOfMotion || '');
    setLocalLoadValue(exercise.defaultLoad?.value?.toString() || exercise.loadValue?.toString() || '');
    setLocalLoadUnit(resolveLoadPreset(exercise));
    setLocalLoadText(exercise.defaultLoad?.text || exercise.loadText || '');
    setTechnicalDetailsModified(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on exercise switch (id), not on every field update
  }, [exercise.id]);

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
    const hasExecutionTime = (localExecTime ?? 0) > 0;
    const hasDuration = (localDuration ?? 0) > 0;
    const hasVolume = hasReps || hasExecutionTime || hasDuration;
    const hasTags = HIDE_EXERCISE_TAGS ? true : mainTags.length > 0;

    return {
      isValid: hasSets && hasVolume && hasTags,
      hasSets,
      hasReps,
      hasExecutionTime,
      hasDuration,
      hasVolume,
      hasTags,
    };
  }, [localSets, localReps, localExecTime, localDuration, mainTags]);

  // Combined missing fields
  const missingFields = useMemo(() => {
    const missing: string[] = [];

    if (!contentValidation.isPatientDescValid) {
      missing.push('Opis pacjenta (min. 50 znaków)');
    }
    if (!contentValidation.isClinicalDescValid) {
      missing.push('Opis kliniczny (min. 20 znaków)');
    }
    if (!dataValidation.hasSets) {
      missing.push('Liczba serii');
    }
    if (!dataValidation.hasVolume) {
      missing.push('Powtórzenia lub czas');
    }
    if (!HIDE_EXERCISE_TAGS && !dataValidation.hasTags) {
      missing.push('Tagi główne');
    }
    if (!exercise.name?.trim() || exercise.name.trim().length < 2) {
      missing.push('Nazwa ćwiczenia');
    }
    if (
      !exercise.videoUrl &&
      !exercise.thumbnailUrl &&
      !exercise.imageUrl &&
      (!exercise.images || exercise.images.length === 0)
    ) {
      missing.push('Media (wideo lub zdjęcie)');
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

  const handleLoadCommit = useCallback(
    async (nextLoadPreset: LoadPresetKey, nextLoadValue: string, nextLoadText: string) => {
      const defaultLoadUpdate = buildDefaultLoadUpdate(nextLoadPreset, nextLoadValue, nextLoadText);
      await onFieldChange('defaultLoad', defaultLoadUpdate);
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

  const descriptionValue = exercise.patientDescription || exercise.description || '';

  // ============================================
  // RENDER HELPERS
  // ============================================

  const isInvalid = (value: number | null) => value === null || value <= 0;
  const renderFieldIcon = (fieldKey: ExerciseFieldKey) => {
    const iconKey = EXERCISE_FIELD_METADATA[fieldKey].iconKey;
    if (!iconKey) {
      return null;
    }
    const IconComponent = FIELD_ICONS[iconKey];
    return <IconComponent className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div
        className={cn('@container/editor flex h-full flex-col overflow-x-hidden overflow-y-auto pr-2', className)}
        data-testid={testId}
      >
        <div className="space-y-4 pb-4">
          <EditorSection
            index={1}
            title="Nazwa i kategoria"
            icon={FileText}
            description="Nazwa ćwiczenia i tagi do wyszukiwania."
          >
            <VerificationStickyHeader
              exercise={exercise}
              onFieldChange={onFieldChange}
              disabled={disabled}
              className="shrink-0 min-w-0"
              data-testid="verification-editor-header"
            />

            {!HIDE_EXERCISE_TAGS && (
              <div className="mt-3 min-w-0">
                <TagSmartChips
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  exerciseDescription={descriptionValue}
                  tags={mainTags}
                  onTagsChange={onMainTagsChange}
                  tagType="main"
                  label="Tagi"
                  disabled={disabled}
                  data-testid="verification-editor-main-tags"
                />
                <div className="mt-3">
                  <TagSmartChips
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    exerciseDescription={descriptionValue}
                    tags={additionalTags}
                    onTagsChange={onAdditionalTagsChange}
                    tagType="additional"
                    label="Tagi dodatkowe"
                    disabled={disabled}
                    data-testid="verification-editor-additional-tags"
                  />
                </div>
              </div>
            )}
          </EditorSection>

          <EditorSection
            index={2}
            title="Parametry treningowe"
            icon={Dumbbell}
            description="Serie, powtórzenia, tempo i obciążenie."
          >
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

          {/* Flex row for core metrics - always in one line, shrinks responsively */}
          <div className="flex gap-1.5">
            {/* Liczba serii */}
            <div className="flex-1 min-w-0 space-y-1">
              <ExerciseFieldLabelWithTooltip
                label="Serie"
                tooltip={EXERCISE_FIELD_TOOLTIPS.sets}
                icon={renderFieldIcon('sets')}
                className="justify-center"
                labelClassName={cn(
                  'text-[9px] uppercase tracking-wider text-center truncate',
                  isInvalid(localSets) ? 'text-destructive font-medium' : 'text-muted-foreground'
                )}
                testId="verification-sets-info"
              />
              <div
                className={cn(
                  'relative h-12 rounded-lg transition-all duration-200',
                  'bg-card/70 border',
                  isInvalid(localSets) ? 'border-destructive/50' : 'border-border/70',
                  'hover:border-border focus-within:border-primary/50'
                )}
              >
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={localSets ?? ''}
                  onChange={(e) =>
                    setLocalSets(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))
                  }
                  onBlur={() => handleNumberBlur('defaultSets', localSets)}
                  disabled={disabled}
                  placeholder="0"
                  className="w-full h-full bg-transparent text-lg font-bold text-center outline-none text-foreground placeholder:text-muted-foreground/80 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-sets"
                />
              </div>
            </div>

            {/* Powtórzenia */}
            <div className="flex-1 min-w-0 space-y-1">
              <ExerciseFieldLabelWithTooltip
                label="Powtórzenia"
                tooltip={EXERCISE_FIELD_TOOLTIPS.reps}
                icon={renderFieldIcon('reps')}
                className="justify-center"
                labelClassName="text-[9px] uppercase tracking-wider text-center text-muted-foreground truncate"
                testId="verification-reps-info"
              />
              <div
                className={cn(
                  'relative h-12 rounded-lg transition-all duration-200',
                  'bg-card/70 border border-border/70',
                  'hover:border-border focus-within:border-primary/50',
                  localDuration && !localReps && 'opacity-40'
                )}
              >
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={localReps ?? ''}
                  onChange={(e) =>
                    setLocalReps(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))
                  }
                  onBlur={() => handleNumberBlur('defaultReps', localReps)}
                  disabled={disabled}
                  placeholder="0"
                  className="w-full h-full bg-transparent text-lg font-bold text-center outline-none text-foreground placeholder:text-muted-foreground/80 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-reps"
                />
              </div>
            </div>

            {/* Czas powtórzenia */}
            <div className="flex-1 min-w-0 space-y-1">
              <ExerciseFieldLabelWithTooltip
                label="Czas powtórzenia"
                tooltip={EXERCISE_FIELD_TOOLTIPS.executionTime}
                icon={renderFieldIcon('executionTime')}
                className="justify-center"
                labelClassName="text-[9px] uppercase tracking-wider text-center text-muted-foreground truncate"
                testId="verification-execution-time-info"
              />
              <div
                className={cn(
                  'relative h-12 rounded-lg transition-all duration-200',
                  'bg-card/70 border border-border/70',
                  'hover:border-border focus-within:border-primary/50',
                  localReps && !localExecTime && 'opacity-40'
                )}
              >
                <input
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={localExecTime ?? ''}
                  onChange={(e) =>
                    setLocalExecTime(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))
                  }
                  onBlur={() => handleNumberBlur('defaultExecutionTime', localExecTime)}
                  disabled={disabled}
                  placeholder="—"
                  className="w-full h-full bg-transparent text-lg font-bold text-center outline-none text-foreground placeholder:text-muted-foreground/80 pr-5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-execution-time"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                  s
                </span>
              </div>
            </div>

            {/* Przerwa między seriami */}
            <div className="flex-1 min-w-0 space-y-1">
              <ExerciseFieldLabelWithTooltip
                label="Przerwa (serie)"
                tooltip={EXERCISE_FIELD_TOOLTIPS.restSets}
                icon={renderFieldIcon('restSets')}
                className="justify-center"
                labelClassName="text-[9px] uppercase tracking-wider text-center text-muted-foreground truncate"
                testId="verification-rest-sets-info"
              />
              <div
                className={cn(
                  'relative h-12 rounded-lg transition-all duration-200',
                  'bg-card/70 border border-border/70',
                  'hover:border-border focus-within:border-primary/50'
                )}
              >
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={5}
                  value={localRest ?? ''}
                  onChange={(e) =>
                    setLocalRest(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))
                  }
                  onBlur={() => handleNumberBlur('defaultRestBetweenSets', localRest)}
                  disabled={disabled}
                  placeholder="60"
                  className="w-full h-full bg-transparent text-lg font-bold text-center outline-none text-foreground placeholder:text-muted-foreground/80 pr-5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  data-testid="core-metric-rest"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                  s
                </span>
              </div>
            </div>
          </div>

          <Collapsible open={isTechnicalOpen} onOpenChange={setIsTechnicalOpen} className="shrink-0 mt-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Szczegóły techniczne
                </span>
                {technicalDetailsModified ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-full bg-emerald-500/15 px-2 text-[10px] font-medium text-emerald-600"
                        data-testid="verification-technical-status-badge"
                      >
                        Edytowano
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Zmiany techniczne są zapisywane po opuszczeniu pola.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Bez zmian</span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  isTechnicalOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="rounded-b-lg border border-border/60 border-t-0 bg-card/60 p-4">
                {/* Responsive technical grid for stable alignment */}
                <div className="grid grid-cols-1 gap-x-3 gap-y-4 @md/editor:grid-cols-2 @4xl/editor:grid-cols-3">
                {/* Typ ćwiczenia */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Typ"
                    tooltip="Tryb ćwiczenia: na powtórzenia lub na czas."
                    icon={renderFieldIcon('reps')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-type-info"
                  />
                  <Select
                    value={localType}
                    onValueChange={(v) => {
                      setLocalType(v);
                      setTechnicalDetailsModified(true);
                      handleSelectChange('type', v);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 border-border/70 bg-card/70" data-testid="property-type">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tempo */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Tempo"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.tempo}
                    icon={renderFieldIcon('tempo')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-tempo-info"
                  />
                  <Input
                    type="text"
                    value={localTempo}
                    onChange={(e) => {
                      const value = e.target.value.replaceAll(/\D/g, '').slice(0, 4);
                      setLocalTempo(value);
                      setTechnicalDetailsModified(true);
                    }}
                    onBlur={() => handleSelectChange('tempo', localTempo)}
                    disabled={disabled}
                    placeholder="3010"
                    className="h-9 border-border/70 bg-card/70 text-center font-mono"
                    maxLength={4}
                    data-testid="property-tempo"
                  />
                </div>

                {/* Trudność */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Trudność"
                    tooltip="Poziom złożoności ćwiczenia pomocny przy doborze progresji."
                    icon={renderFieldIcon('difficultyLevel')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-difficulty-info"
                  />
                  <Select
                    value={localDifficulty}
                    onValueChange={(v) => {
                      setLocalDifficulty(v);
                      setTechnicalDetailsModified(true);
                      handleSelectChange('difficultyLevel', v);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 border-border/70 bg-card/70" data-testid="property-difficulty">
                      <SelectValue placeholder="—" />
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
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Strona"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.exerciseSide}
                    icon={renderFieldIcon('side')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-side-info"
                  />
                  <Select
                    value={localSide}
                    onValueChange={(v) => {
                      setLocalSide(v);
                      setTechnicalDetailsModified(true);
                      handleSelectChange('side', v);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 border-border/70 bg-card/70" data-testid="property-side">
                      <SelectValue placeholder="—" />
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

                {/* Zakres ruchu */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Zakres ruchu"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.rangeOfMotion}
                    icon={renderFieldIcon('rangeOfMotion')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-range-of-motion-info"
                  />
                  <Select
                    value={localRangeOfMotion}
                    onValueChange={(v) => {
                      setLocalRangeOfMotion(v);
                      setTechnicalDetailsModified(true);
                      handleSelectChange('rangeOfMotion', v);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 border-border/70 bg-card/70" data-testid="property-rom">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_OF_MOTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Przerwa między powtórzeniami */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Przerwa powt."
                    tooltip={EXERCISE_FIELD_TOOLTIPS.restReps}
                    icon={renderFieldIcon('restReps')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-rest-reps-info"
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={localRestBetweenReps ?? ''}
                      onChange={(e) => {
                        setLocalRestBetweenReps(
                          e.target.value === '' ? null : Number.parseInt(e.target.value, 10)
                        );
                        setTechnicalDetailsModified(true);
                      }}
                      onBlur={() => handleNumberBlur('defaultRestBetweenReps', localRestBetweenReps)}
                      disabled={disabled}
                      placeholder="0"
                      className="h-9 border-border/70 bg-card/70 pr-6 text-center"
                      data-testid="property-rest-reps"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                  </div>
                </div>

                {/* Czas przygotowania */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Przygotowanie"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.preparationTime}
                    icon={renderFieldIcon('preparationTime')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-preparation-time-info"
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={localPrepTime ?? ''}
                      onChange={(e) => {
                        setLocalPrepTime(e.target.value === '' ? null : Number.parseInt(e.target.value, 10));
                        setTechnicalDetailsModified(true);
                      }}
                      onBlur={() => handleNumberBlur('preparationTime', localPrepTime)}
                      disabled={disabled}
                      placeholder="0"
                      className="h-9 border-border/70 bg-card/70 pr-6 text-center"
                      data-testid="property-prep-time"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                  </div>
                </div>

                {/* Czas serii */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Czas serii"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.duration}
                    icon={renderFieldIcon('duration')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-duration-info"
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      step={5}
                      value={localDuration ?? ''}
                      onChange={(e) => {
                        setLocalDuration(e.target.value === '' ? null : Number.parseInt(e.target.value, 10));
                        setTechnicalDetailsModified(true);
                      }}
                      onBlur={() => handleNumberBlur('defaultDuration', localDuration)}
                      disabled={disabled}
                      placeholder="0"
                      className="h-9 border-border/70 bg-card/70 pr-6 text-center"
                      data-testid="property-duration"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                  </div>
                </div>

                {/* Sugerowany opór/obciążenie */}
                <div className="min-w-0 space-y-1.5">
                  <ExerciseFieldLabelWithTooltip
                    label="Typ obciążenia"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.load}
                    icon={renderFieldIcon('load')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-load-info"
                  />
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      value={localLoadValue}
                      onChange={(e) => {
                        setLocalLoadValue(e.target.value);
                        setTechnicalDetailsModified(true);
                      }}
                      onBlur={() => handleLoadCommit(localLoadUnit, localLoadValue, localLoadText)}
                      disabled={disabled}
                      placeholder="10"
                      className="h-9 w-16 border-border/70 bg-card/70 text-center"
                      data-testid="property-load-value"
                    />
                    <Select
                      value={localLoadUnit}
                      onValueChange={(v) => {
                        const nextLoadPreset = v as LoadPresetKey;
                        setLocalLoadUnit(nextLoadPreset);
                        setTechnicalDetailsModified(true);
                        void handleLoadCommit(nextLoadPreset, localLoadValue, localLoadText);
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        className="h-9 flex-1 border-border/70 bg-card/70"
                        data-testid="property-load-unit"
                      >
                        <SelectValue placeholder="kg" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAD_PRESETS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Opis obciążenia - zajmuje 2 kolumny */}
                <div className="col-span-2 space-y-1.5 2xl:col-span-3">
                  <ExerciseFieldLabelWithTooltip
                    label="Opis obciążenia"
                    tooltip={EXERCISE_FIELD_TOOLTIPS.load}
                    icon={renderFieldIcon('load')}
                    labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
                    testId="verification-load-text-info"
                  />
                  <Input
                    type="text"
                    value={localLoadText}
                    onChange={(e) => {
                      setLocalLoadText(e.target.value);
                      setTechnicalDetailsModified(true);
                    }}
                    onBlur={() => handleLoadCommit(localLoadUnit, localLoadValue, localLoadText)}
                    disabled={disabled}
                    placeholder="np. RPE 7, 60% 1RM, lekka guma..."
                    className="h-9 border-border/70 bg-card/70"
                    data-testid="property-load-text"
                  />
                </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          </EditorSection>

          <EditorSection
            index={3}
            title="Opis dla pacjenta i fizjoterapeuty"
            icon={User}
            description="Prosty opis dla pacjenta oraz opis kliniczny."
          >
          <Tabs
            value={activeDescTab}
            onValueChange={(v) => setActiveDescTab(v as 'clinical' | 'patient')}
            className="flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 h-9 mb-3 shrink-0">
              <TabsTrigger
                value="patient"
                className={cn(
                  'text-xs gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400',
                  !contentValidation.isPatientDescValid && 'text-amber-500'
                )}
                data-testid="desc-tab-patient"
              >
                <User className="h-3.5 w-3.5" />
                Dla Pacjenta
                {!contentValidation.isPatientDescValid && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className={cn(
                  'text-xs gap-1.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400',
                  !contentValidation.isClinicalDescValid && 'text-amber-500'
                )}
                data-testid="desc-tab-clinical"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Dla Fizjoterapeuty
                {!contentValidation.isClinicalDescValid && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </TabsTrigger>
            </TabsList>

            {/* Patient Description */}
            <TabsContent value="patient" className="mt-0">
              <div
                className={cn(
                  'min-h-[180px] rounded-lg border transition-colors',
                  activeDescTab === 'patient' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/70'
                )}
              >
                <Textarea
                  value={localPatientDesc}
                  onChange={(e) => setLocalPatientDesc(e.target.value)}
                  onBlur={() => handleDescriptionBlur('patientDescription', localPatientDesc)}
                  placeholder="Wpisz prosty opis dla pacjenta - jak Pani Jadzia ma wykonać to ćwiczenie..."
                  disabled={disabled || isDescSaving}
                  className={cn(
                    'min-h-[180px] resize-none border-0 bg-transparent',
                    'text-sm leading-relaxed placeholder:text-muted-foreground/80'
                  )}
                  data-testid="desc-patient-textarea"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span>Prosty język zrozumiały dla pacjenta</span>
                <span className={cn(contentValidation.isPatientDescValid ? 'text-emerald-500' : 'text-amber-500')}>
                  {contentValidation.patientDescLength}/50 znaków
                </span>
              </p>
            </TabsContent>

            {/* Clinical Description */}
            <TabsContent value="clinical" className="mt-0">
              <div
                className={cn(
                  'min-h-[180px] rounded-lg border transition-colors',
                  activeDescTab === 'clinical' ? 'border-blue-500/30 bg-blue-500/5' : 'border-border/70'
                )}
              >
                <Textarea
                  value={localClinicalDesc}
                  onChange={(e) => setLocalClinicalDesc(e.target.value)}
                  onBlur={() => handleDescriptionBlur('clinicalDescription', localClinicalDesc)}
                  placeholder="Opis kliniczny: biomechanika, mięśnie aktywowane, wskazania medyczne..."
                  disabled={disabled || isDescSaving}
                  className={cn(
                    'min-h-[180px] resize-none border-0 bg-transparent',
                    'text-sm leading-relaxed placeholder:text-muted-foreground/80'
                  )}
                  data-testid="desc-clinical-textarea"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-between">
                <span>Terminologia medyczna dla specjalistów</span>
                <span className={cn(contentValidation.isClinicalDescValid ? 'text-emerald-500' : 'text-amber-500')}>
                  {contentValidation.clinicalDescLength}/20 znaków
                </span>
              </p>
            </TabsContent>
          </Tabs>
          </EditorSection>

          <EditorSection
            index={4}
            title="Instrukcje i wskazówki"
            icon={FileText}
            description="Kroki wykonania, błędy i bezpieczeństwo."
          >
            <Collapsible open={isEnrichmentOpen} onOpenChange={setIsEnrichmentOpen} className="shrink-0">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Treść i wskazówki ćwiczenia
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    isEnrichmentOpen && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-b-lg border border-border/60 border-t-0 bg-card/60 p-3">
                  <EnrichmentEditor
                    exercise={exercise}
                    enrichmentData={exercise.enrichmentData}
                    videoUrl={exercise.videoUrl}
                    disabled={disabled}
                    onFieldChange={onFieldChange}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </EditorSection>

          <EditorSection
            index={5}
            title="Wskazówka głosowa i notatki"
            icon={Volume2}
            description="Krótka podpowiedź audio i notatki wewnętrzne."
          >
            <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-primary" />
            Wskazówki audio i notatki
          </h3>

          <div className="space-y-1.5">
            <ExerciseFieldLabelWithTooltip
              label="Audio cue"
              tooltip={EXERCISE_FIELD_TOOLTIPS.audioCue}
              icon={renderFieldIcon('audioCue')}
              labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
              testId="verification-audio-cue-info"
            />
            <Input
              type="text"
              value={localAudioCue}
              onChange={(e) => setLocalAudioCue(e.target.value)}
              onBlur={() => handleSelectChange('audioCue', localAudioCue)}
              disabled={disabled}
              placeholder="Krótka wskazówka głosowa dla pacjenta"
              className="h-9 border-border/70 bg-card/70"
              data-testid="verification-audio-cue"
            />
          </div>

          <div className="space-y-1.5">
            <ExerciseFieldLabelWithTooltip
              label="Notatki wewnętrzne"
              tooltip={EXERCISE_FIELD_TOOLTIPS.notes}
              icon={renderFieldIcon('notes')}
              labelClassName="min-h-4 truncate text-[10px] uppercase tracking-wider text-muted-foreground"
              testId="verification-notes-info"
            />
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => handleDescriptionBlur('notes', localNotes)}
              placeholder="Notatki techniczne, wskazówki redakcyjne, dodatkowy kontekst kliniczny..."
              disabled={disabled}
              className="min-h-[90px] border-border/70 bg-card/70"
              data-testid="verification-notes-textarea"
            />
          </div>
            </div>
          </EditorSection>
        </div>
      </div>
    </TooltipProvider>
  );
}
