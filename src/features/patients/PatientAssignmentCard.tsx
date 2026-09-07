'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client/react';
import {
  ChevronDown,
  ChevronRight,
  CalendarPlus,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  Eye,
  EyeOff,
  Plus,
  FilePenLine,
  FileDown,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ScheduleSummary } from '@/components/shared';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  EXERCISE_FIELD_METADATA,
  ExerciseExecutionCard,
  fromExerciseMapping,
  listOverriddenFieldKeys,
  resolveEffectiveExerciseParams,
  type ExerciseOverrideFields,
} from '@/components/shared/exercise';
import type { ExerciseMapping as AssignmentExerciseMapping } from '@/features/assignment/types';
import { cn } from '@/lib/utils';
import { toGqlStatus } from '@/utils/statusUtils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { resolveAssignmentDisplayStatus } from '@/features/patients/utils/assignmentDisplayStatus';

import {
  UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';

// Types
export interface Frequency {
  timesPerDay?: number;
  timesPerWeek?: number;
  breakBetweenSets?: number;
  isFlexible?: boolean;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

export interface ExerciseMapping {
  id: string;
  exerciseId: string;
  exerciseSetId?: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  preparationTime?: number;
  restSets?: number;
  restReps?: number;
  executionTime?: number;
  tempo?: string;
  notes?: string;
  customName?: string;
  customDescription?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  load?: {
    loadWeightKg?: number | null;
    loadSource?: string | null;
    type?: string;
    value?: number;
    unit?: string;
    text?: string;
  };
  exercise?: {
    id: string;
    name: string;
    type?: string;
    side?: string;
    patientDescription?: string;
    clinicalDescription?: string;
    audioCue?: string;
    thumbnailUrl?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    defaultExecutionTime?: number;
    preparationTime?: number;
    rangeOfMotion?: string;
    difficultyLevel?: string;
    tempo?: string;
    exerciseSide?: string;
    imageUrl?: string;
    images?: string[];
    videoUrl?: string;
    description?: string;
    sets?: number;
    reps?: number;
    duration?: number;
  };
}

/** Patient JSON override — SSOT keys from SPEC-012 / exerciseOverride.ts */
export type ExerciseOverride = ExerciseOverrideFields;

export interface PatientAssignment {
  id: string;
  userId: string;
  assignedBy?: {
    id: string;
    fullname?: string;
    email?: string;
  };
  exerciseSetId?: string;
  exerciseOverrides?: string;
  status?: string;
  assignedAt?: string;
  startDate?: string;
  endDate?: string;
  completionCount?: number;
  lastCompletedAt?: string;
  currentCycleStartedAt?: string;
  notes?: string;
  frequency?: Frequency;
  exerciseSet?: {
    id: string;
    name: string;
    description?: string;
    organizationId?: string;
    exerciseMappings?: ExerciseMapping[];
  };
}

interface PatientAssignmentCardProps {
  readonly assignment: PatientAssignment;
  readonly patientId: string;
  readonly patientPremiumValidUntil?: string | null;
  readonly onEditPlan?: (assignment: PatientAssignment) => void;
  readonly onEditExercise?: (
    assignment: PatientAssignment,
    mapping: ExerciseMapping,
    override?: ExerciseOverride
  ) => void;
  readonly onPreviewExercise?: (mapping: ExerciseMapping, override?: ExerciseOverride) => void;
  readonly onAddExercise?: (assignment: PatientAssignment) => void;
  readonly onExtend?: (assignment: PatientAssignment) => void;
  readonly onGeneratePDF?: (assignment: PatientAssignment) => void;
  readonly onActivatePremium?: () => void;
  readonly onRefresh?: () => void;
}

function toPositiveNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined;
  }

  return numericValue;
}

// Helper functions

export function buildUnassignRefetchQueries(patientId: string, organizationId?: string) {
  return [
    { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } },
    ...(organizationId ? [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }] : []),
  ];
}

export function PatientAssignmentCard({
  assignment,
  patientId,
  patientPremiumValidUntil,
  onEditPlan,
  onEditExercise,
  onPreviewExercise,
  onAddExercise,
  onExtend,
  onGeneratePDF,
  onActivatePremium,
  onRefresh,
}: PatientAssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null);
  const [removingExerciseName, setRemovingExerciseName] = useState<string>('');

  // Parse exercise overrides
  const exerciseOverrides: Record<string, ExerciseOverride> = React.useMemo(() => {
    if (!assignment.exerciseOverrides) return {};
    try {
      return JSON.parse(assignment.exerciseOverrides);
    } catch {
      return {};
    }
  }, [assignment.exerciseOverrides]);

  // Mutations
  const [updateAssignment, { loading: updating }] = useMutation(UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION);

  const [updateOverrides] = useMutation(UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION);

  const [removeAssignment, { loading: removing }] = useMutation(REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION);

  const exerciseSet = assignment.exerciseSet;
  const exercises = exerciseSet?.exerciseMappings || [];
  const assignmentDisplayStatus = React.useMemo(
    () =>
      resolveAssignmentDisplayStatus({
        status: assignment.status,
        endDate: assignment.endDate,
        premiumValidUntil: patientPremiumValidUntil,
      }),
    [assignment.endDate, assignment.status, patientPremiumValidUntil]
  );

  const visibleExercises = exercises.filter((m) => {
    const override = exerciseOverrides[m.id];
    return !override?.hidden;
  });
  const hiddenExercisesCount = exercises.length - visibleExercises.length;

  // Handlers
  const handleToggleStatus = async () => {
    if (assignmentDisplayStatus.primary.kind === 'expired') {
      toast.error('Ten plan wygasł. Użyj akcji „Przedłuż zestaw”.');
      return;
    }
    const newStatus = assignment.status === 'active' ? 'paused' : 'active';
    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          status: toGqlStatus(newStatus),
          statusLegacy: newStatus,
        },
        refetchQueries: [{ query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } }],
      });
      toast.success(newStatus === 'active' ? 'Zestaw wznowiony' : 'Zestaw wstrzymany');
      onRefresh?.();
    } catch (error) {
      console.error('Błąd zmiany statusu:', error);
      toast.error('Nie udało się zmienić statusu');
    }
  };

  const handleToggleExerciseVisibility = async (mappingId: string) => {
    const currentOverride = exerciseOverrides[mappingId] || {};
    const newOverrides = {
      ...exerciseOverrides,
      [mappingId]: {
        ...currentOverride,
        hidden: !currentOverride.hidden,
      },
    };

    try {
      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides: JSON.stringify(newOverrides),
        },
        refetchQueries: [{ query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } }],
      });
      toast.success(currentOverride.hidden ? 'Ćwiczenie pokazane' : 'Ćwiczenie ukryte');
      onRefresh?.();
    } catch (error) {
      console.error('Błąd zmiany widoczności:', error);
      toast.error('Nie udało się zmienić widoczności ćwiczenia');
    }
  };

  const handleRemoveExercise = async () => {
    if (!removingExerciseId) return;

    const currentOverride = exerciseOverrides[removingExerciseId] || {};
    const newOverrides = {
      ...exerciseOverrides,
      [removingExerciseId]: {
        ...currentOverride,
        hidden: true,
      },
    };

    try {
      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides: JSON.stringify(newOverrides),
        },
        refetchQueries: [{ query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } }],
      });
      toast.success('Ćwiczenie usunięte z zestawu pacjenta');
      setRemovingExerciseId(null);
      setRemovingExerciseName('');
      onRefresh?.();
    } catch (error) {
      console.error('Błąd usuwania ćwiczenia:', error);
      toast.error('Nie udało się usunąć ćwiczenia');
    }
  };

  const handleStartRemoveExercise = (mappingId: string, exerciseName: string) => {
    setRemovingExerciseId(mappingId);
    setRemovingExerciseName(exerciseName);
  };

  const handleDelete = async () => {
    if (!exerciseSet) return;

    const refetchQueries = buildUnassignRefetchQueries(patientId, exerciseSet.organizationId);

    try {
      await removeAssignment({
        variables: {
          exerciseSetId: exerciseSet.id,
          patientId,
        },
        refetchQueries,
      });
      toast.success('Przypisanie zostało usunięte');
      setIsDeleteDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('Błąd usuwania:', error);
      toast.error('Nie udało się usunąć przypisania');
    }
  };

  const getEffectiveParams = (mapping: ExerciseMapping) => {
    const override = exerciseOverrides[mapping.id];
    const effective = resolveEffectiveExerciseParams(
      {
        id: mapping.id,
        sets: mapping.sets,
        reps: mapping.reps,
        duration: mapping.duration,
        executionTime: mapping.executionTime,
        restSets: mapping.restSets,
        restReps: mapping.restReps,
        preparationTime: mapping.preparationTime,
        tempo: mapping.tempo,
        notes: mapping.notes,
        customName: mapping.customName,
        customDescription: mapping.customDescription,
        load: mapping.load,
        loadType: mapping.loadType,
        loadValue: mapping.loadValue,
        loadUnit: mapping.loadUnit,
        loadText: mapping.loadText,
        exercise: mapping.exercise,
      },
      override
    );

    return {
      sets: toPositiveNumber(effective.sets),
      reps: toPositiveNumber(effective.reps),
      duration: toPositiveNumber(effective.duration),
      executionTime: toPositiveNumber(effective.executionTime),
      restSets: toPositiveNumber(effective.restSets),
      restReps: toPositiveNumber(effective.restReps),
      preparationTime: toPositiveNumber(effective.preparationTime),
      tempo: effective.tempo,
      loadKg: effective.loadKg,
      rangeOfMotion: effective.rangeOfMotion,
      side: effective.side,
      notes: effective.notes,
      customName: effective.customName,
      customDescription: effective.customDescription,
      customImages: effective.customImages ?? [],
      hidden: effective.hidden,
      overriddenKeys: effective.overriddenKeys,
    };
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card
          className={cn(
            'transition-all duration-200 border-border/60 overflow-hidden',
            isExpanded && 'ring-1 ring-primary/20 border-primary/30'
          )}
          data-testid={`patient-assignment-${assignment.id}`}
        >
          {/* Header - always visible */}
          <CollapsibleTrigger asChild>
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4 cursor-pointer hover:bg-surface-light/50 transition-colors sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
              {/* Expand icon */}
              <div className="hidden h-10 w-6 items-center justify-center text-muted-foreground sm:flex sm:h-12">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {/* Set thumbnail */}
              <div className="relative h-10 w-10 rounded-sm overflow-hidden shrink-0 bg-surface-light sm:h-12 sm:w-12">
                {getMediaUrl(exercises[0]?.exercise?.imageUrl || exercises[0]?.exercise?.images?.[0]) ? (
                  <Image
                    src={getMediaUrl(exercises[0]?.exercise?.imageUrl || exercises[0]?.exercise?.images?.[0]) || ''}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                ) : (
                  <ImagePlaceholder type="set" iconClassName="h-5 w-5" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="min-w-0 font-semibold leading-snug text-foreground wrap-anywhere">
                    {exerciseSet?.name || 'Nieznany zestaw'}
                  </p>
                  <Badge
                    variant={assignmentDisplayStatus.primary.variant}
                    className="text-[10px] shrink-0"
                    data-testid={`patient-assignment-status-badge-${assignment.id}`}
                  >
                    {assignmentDisplayStatus.primary.label}
                  </Badge>
                  {assignmentDisplayStatus.secondary &&
                    (onActivatePremium ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivatePremium();
                        }}
                        data-testid={`patient-assignment-premium-hint-${assignment.id}`}
                        className="inline-flex"
                      >
                        <Badge
                          variant={assignmentDisplayStatus.secondary.variant}
                          className="text-[10px] shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {assignmentDisplayStatus.secondary.label}
                        </Badge>
                      </button>
                    ) : (
                      <Badge
                        variant={assignmentDisplayStatus.secondary.variant}
                        className="text-[10px] shrink-0"
                        data-testid={`patient-assignment-premium-hint-${assignment.id}`}
                      >
                        {assignmentDisplayStatus.secondary.label}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {visibleExercises.length} ćwiczeń
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                {assignmentDisplayStatus.primary.kind === 'expired' && onExtend && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 shrink-0 border-primary/40 text-primary hover:bg-primary/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExtend(assignment);
                    }}
                    data-testid={`patient-assignment-${assignment.id}-extend-quick-btn`}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Przedłuż
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Opcje planu"
                      title="Opcje planu"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(event) => event.stopPropagation()}
                      data-testid={`patient-assignment-${assignment.id}-menu-trigger`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onGeneratePDF?.(assignment)}
                      data-testid={`patient-assignment-${assignment.id}-pdf-btn`}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Pobierz PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onEditPlan?.(assignment)}
                      data-testid={`patient-assignment-${assignment.id}-edit-plan-btn`}
                    >
                      <FilePenLine className="mr-2 h-4 w-4" />
                      Edytuj plan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onExtend?.(assignment)}
                      data-testid={`patient-assignment-${assignment.id}-extend-btn`}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      {assignmentDisplayStatus.primary.kind === 'expired'
                        ? 'Przedłuż wygasły zestaw'
                        : 'Przedłuż zestaw'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleToggleStatus}
                      disabled={updating || assignmentDisplayStatus.primary.kind === 'expired'}
                    >
                      {assignment.status === 'active' ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Wstrzymaj
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Wznów
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`patient-assignment-${assignment.id}-remove-btn`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń przypisanie
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {assignment.startDate && assignment.endDate && assignment.frequency && (
                <ScheduleSummary
                  startDate={assignment.startDate}
                  endDate={assignment.endDate}
                  frequency={assignment.frequency}
                  variant="compact"
                  showSessions={false}
                  showStartInDays={false}
                  testIdPrefix={`patient-assignment-${assignment.id}`}
                  className="col-span-full sm:col-span-2 sm:col-start-3"
                />
              )}
            </div>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0 pb-4">
              <div className="rounded-xl border border-border/50 bg-surface-light/30 p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan pacjenta</p>
                    {assignment.startDate && assignment.endDate && assignment.frequency && (
                      <ScheduleSummary
                        startDate={assignment.startDate}
                        endDate={assignment.endDate}
                        frequency={assignment.frequency}
                        variant="card"
                        showSessions
                        showStartInDays={false}
                        className="border-0 bg-transparent p-0"
                        testIdPrefix={`patient-assignment-expanded-${assignment.id}`}
                      />
                    )}
                    {assignment.frequency?.breakBetweenSets && (
                      <p className="text-sm text-muted-foreground">
                        Min. {assignment.frequency.breakBetweenSets}h między sesjami
                      </p>
                    )}
                    {assignment.assignedBy?.fullname && (
                      <p className="text-xs text-muted-foreground">Przypisał: {assignment.assignedBy.fullname}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onEditPlan?.(assignment)}
                    className="shrink-0"
                    data-testid={`patient-assignment-${assignment.id}-edit-plan-primary-btn`}
                  >
                    <FilePenLine className="mr-2 h-4 w-4" />
                    Edytuj plan
                  </Button>
                </div>
              </div>

              {/* Exercises list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ćwiczenia ({visibleExercises.length}
                    {hiddenExercisesCount > 0 ? `/${exercises.length}` : ''})
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddExercise?.(assignment)}
                    className="h-8 text-xs gap-1.5 border-dashed hover:border-primary hover:bg-primary/5"
                    data-testid={`patient-assignment-${assignment.id}-add-exercise-btn`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Dodaj ćwiczenie
                  </Button>
                </div>

                <TooltipProvider delayDuration={300}>
                  <div className="space-y-2">
                    {[...exercises]
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .filter((m) => !exerciseOverrides[m.id]?.hidden)
                      .map((mapping) => {
                        const override = exerciseOverrides[mapping.id];
                        const params = getEffectiveParams(mapping);
                        const exerciseName = params.customName || mapping.exercise?.name || 'Nieznane';
                        const overriddenKeys = listOverriddenFieldKeys(override).filter(
                          (key) => key !== 'hidden' && key !== 'customImages' && key !== 'load'
                        );
                        const cardData = fromExerciseMapping(
                          {
                            ...mapping,
                            exerciseId: mapping.exerciseId,
                            exercise: mapping.exercise,
                          } as AssignmentExerciseMapping,
                          override
                        );

                        return (
                          <div
                            key={mapping.id}
                            className="overflow-hidden rounded-xl border border-border/40 bg-surface/30"
                            data-testid={`patient-assignment-exercise-${mapping.id}`}
                          >
                            <div className="flex items-stretch gap-1">
                              <div className="min-w-0 flex-1">
                                <ExerciseExecutionCard
                                  mode="view"
                                  viewVariant="readable"
                                  exercise={cardData}
                                  testIdPrefix="patient-assignment-exercise-card"
                                  onPreview={() => onPreviewExercise?.(mapping, override)}
                                  className="rounded-none border-0 bg-transparent"
                                />
                                {overriddenKeys.length > 0 ? (
                                  <div
                                    className="flex flex-wrap gap-1 px-4 pb-3"
                                    data-testid={`patient-assignment-exercise-${mapping.id}-override-badges`}
                                  >
                                    {overriddenKeys.map((key) => {
                                      const metadataKey =
                                        key === 'loadWeightKg' ? 'load' : key === 'exerciseSide' ? 'side' : key;
                                      const label =
                                        metadataKey in EXERCISE_FIELD_METADATA
                                          ? EXERCISE_FIELD_METADATA[metadataKey as keyof typeof EXERCISE_FIELD_METADATA]
                                              .label
                                          : key === 'customName'
                                            ? 'Własna nazwa'
                                            : key === 'customDescription'
                                              ? 'Własny opis'
                                              : key;
                                      return (
                                        <span
                                          key={key}
                                          className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                          data-testid={`patient-assignment-exercise-${mapping.id}-badge-${key}`}
                                          title="Nadpisane dla pacjenta"
                                        >
                                          {label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border/30 px-1.5 py-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      aria-label="Akcja"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => onPreviewExercise?.(mapping, override)}
                                      data-testid={`patient-assignment-exercise-${mapping.id}-preview-btn`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Podgląd</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      aria-label="Akcja"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => onEditExercise?.(assignment, mapping, override)}
                                      data-testid={`patient-assignment-exercise-${mapping.id}-edit-btn`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edytuj parametry</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      aria-label="Akcja"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleStartRemoveExercise(mapping.id, exerciseName)}
                                      data-testid={`patient-assignment-exercise-${mapping.id}-remove-btn`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Usuń z zestawu</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Show hidden exercises count */}
                    {hiddenExercisesCount > 0 && (
                      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                        <EyeOff className="h-3.5 w-3.5" />
                        {hiddenExercisesCount} ukrytych ćwiczeń
                        <Button
                          data-testid="patientassignmentcard-button-767"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-primary"
                          onClick={() => {
                            // Show all hidden exercises
                            exercises.forEach((m) => {
                              if (exerciseOverrides[m.id]?.hidden) {
                                handleToggleExerciseVisibility(m.id);
                              }
                            });
                          }}
                        >
                          Pokaż wszystkie
                        </Button>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </div>

              {/* Stats */}
              {assignment.completionCount !== undefined && assignment.completionCount > 0 && (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Wykonano: <span className="font-medium text-foreground">{assignment.completionCount}</span> razy
                    {assignment.lastCompletedAt && (
                      <> • Ostatnio: {format(new Date(assignment.lastCompletedAt), 'd MMM', { locale: pl })}</>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Assignment Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń przypisanie"
        description={`Czy na pewno chcesz usunąć przypisanie zestawu "${exerciseSet?.name}" dla tego pacjenta? Ta operacja jest nieodwracalna. Usunięcie przypisania może skrócić okres dostępu Premium pacjenta.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={removing}
      />

      {/* Remove Exercise Confirmation */}
      <ConfirmDialog
        open={!!removingExerciseId}
        onOpenChange={(open) => {
          if (!open) {
            setRemovingExerciseId(null);
            setRemovingExerciseName('');
          }
        }}
        title="Usuń ćwiczenie z zestawu"
        description={`Czy na pewno chcesz usunąć ćwiczenie "${removingExerciseName}" z zestawu tego pacjenta? Ćwiczenie pozostanie w oryginalnym zestawie.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemoveExercise}
      />
    </>
  );
}
