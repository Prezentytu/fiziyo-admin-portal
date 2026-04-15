'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client/react';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  CalendarPlus,
  Clock,
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { translateAssignmentStatus, type AssignmentStatus } from '@/utils/statusUtils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { formatDurationPolish } from '@/utils/durationPolish';
import { formatFrequencyDisplay } from '@/utils/frequencyDisplay';

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
  exercise?: {
    id: string;
    name: string;
    type?: string;
    // Nowe pola
    side?: string;
    patientDescription?: string;
    clinicalDescription?: string;
    thumbnailUrl?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    defaultExecutionTime?: number;
    // Legacy aliasy
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

export interface ExerciseOverride {
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  hidden?: boolean;
  customName?: string;
  customDescription?: string;
  notes?: string;
  exerciseSide?: string;
  customImages?: string[];
}

export interface PatientAssignment {
  id: string;
  userId: string;
  exerciseSetId?: string;
  exerciseOverrides?: string;
  status?: string;
  assignedAt?: string;
  startDate?: string;
  endDate?: string;
  completionCount?: number;
  lastCompletedAt?: string;
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
  readonly onEditPlan?: (assignment: PatientAssignment) => void;
  readonly onEditExercise?: (assignment: PatientAssignment, mapping: ExerciseMapping, override?: ExerciseOverride) => void;
  readonly onPreviewExercise?: (mapping: ExerciseMapping, override?: ExerciseOverride) => void;
  readonly onAddExercise?: (assignment: PatientAssignment) => void;
  readonly onExtend?: (assignment: PatientAssignment) => void;
  readonly onGeneratePDF?: (assignment: PatientAssignment) => void;
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

const getStatusVariant = (status?: string): 'success' | 'secondary' | 'warning' | 'destructive' | 'default' => {
  switch (status) {
    case 'assigned':
      return 'default';
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export function buildUnassignRefetchQueries(patientId: string, organizationId?: string) {
  return [
    { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } },
    ...(organizationId
      ? [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }]
      : []),
  ];
}

export function PatientAssignmentCard({
  assignment,
  patientId,
  onEditPlan,
  onEditExercise,
  onPreviewExercise,
  onAddExercise,
  onExtend,
  onGeneratePDF,
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
  const assignmentStatus: AssignmentStatus = React.useMemo(() => {
    const status = assignment.status;
    if (
      status === 'assigned' ||
      status === 'active' ||
      status === 'paused' ||
      status === 'completed' ||
      status === 'cancelled'
    ) {
      return status;
    }
    return 'assigned';
  }, [assignment.status]);

  const visibleExercises = exercises.filter((m) => {
    const override = exerciseOverrides[m.id];
    return !override?.hidden;
  });
  const hiddenExercisesCount = exercises.length - visibleExercises.length;

  // Handlers
  const handleToggleStatus = async () => {
    const newStatus = assignment.status === 'active' ? 'paused' : 'active';
    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          status: newStatus,
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

  // Get effective exercise params (with overrides)
  const getEffectiveParams = (mapping: ExerciseMapping) => {
    const override = exerciseOverrides[mapping.id];

    const sets = toPositiveNumber(override?.sets ?? mapping.sets ?? mapping.exercise?.sets);
    const reps = toPositiveNumber(override?.reps ?? mapping.reps ?? mapping.exercise?.reps);
    const duration = toPositiveNumber(override?.duration ?? mapping.duration ?? mapping.exercise?.duration);
    const executionTime = toPositiveNumber(
      override?.executionTime ?? mapping.executionTime ?? mapping.exercise?.defaultExecutionTime
    );

    return {
      sets,
      reps,
      duration,
      executionTime,
      customName: override?.customName ?? mapping.customName,
      customImages: override?.customImages ?? [],
      hidden: override?.hidden ?? false,
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
            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-light/50 transition-colors">
              {/* Expand icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-light text-muted-foreground">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {/* Set thumbnail */}
              <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-surface-light">
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{exerciseSet?.name || 'Nieznany zestaw'}</p>
                  <Badge variant={getStatusVariant(assignment.status)} className="text-[10px] shrink-0">
                    {translateAssignmentStatus(assignmentStatus)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {visibleExercises.length} ćwiczeń
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatFrequencyDisplay(assignment.frequency)}
                  </span>
                  {assignment.frequency?.timesPerDay && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {assignment.frequency.timesPerDay}x/dzień
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
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
                      Przedłuż zestaw
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleStatus} disabled={updating}>
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
            </div>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0 pb-4">
              <div className="rounded-xl border border-border/50 bg-surface-light/30 p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan pacjenta</p>
                    <p className="text-sm text-foreground">
                      {assignment.startDate && (
                        <>
                          {format(new Date(assignment.startDate), 'd MMM yyyy', { locale: pl })}
                          {assignment.endDate && (
                            <> — {format(new Date(assignment.endDate), 'd MMM yyyy', { locale: pl })}</>
                          )}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFrequencyDisplay(assignment.frequency)}
                      {assignment.frequency?.timesPerDay && assignment.frequency.timesPerDay > 1 && (
                        <>, {assignment.frequency.timesPerDay}x dziennie</>
                      )}
                      {assignment.frequency?.breakBetweenSets && (
                        <>, min. {assignment.frequency.breakBetweenSets}h między sesjami</>
                      )}
                    </p>
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
                      .filter((m) => !exerciseOverrides[m.id]?.hidden) // Only show visible exercises
                      .map((mapping) => {
                        const params = getEffectiveParams(mapping);
                        // Use first custom image if available, otherwise original
                        const imageUrl =
                          params.customImages?.[0] ||
                          getMediaUrl(mapping.exercise?.imageUrl || mapping.exercise?.images?.[0]);
                        const hasCustomImages = params.customImages && params.customImages.length > 0;
                        const hasOverride =
                          exerciseOverrides[mapping.id] &&
                          (exerciseOverrides[mapping.id].sets !== undefined ||
                            exerciseOverrides[mapping.id].reps !== undefined ||
                            exerciseOverrides[mapping.id].duration !== undefined ||
                            exerciseOverrides[mapping.id].customName ||
                            exerciseOverrides[mapping.id].customImages?.length);
                        const exerciseName = params.customName || mapping.exercise?.name || 'Nieznane';

                        return (
                          <div
                            key={mapping.id}
                            className="group flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-surface/30 hover:bg-surface-light hover:border-border/60 transition-all"
                            data-testid={`patient-assignment-exercise-${mapping.id}`}
                          >
                            {/* Larger Thumbnail - 64x64 */}
                            <button
                              type="button"
                              className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-surface-light cursor-pointer ring-1 ring-border/20 hover:ring-primary/40 transition-all"
                              onClick={() => onPreviewExercise?.(mapping, exerciseOverrides[mapping.id])}
                            >
                              {imageUrl ? (
                                <Image src={imageUrl} alt={exerciseName} fill className="object-contain" sizes="64px" />
                              ) : (
                                <ImagePlaceholder type="exercise" iconClassName="h-6 w-6" />
                              )}
                              {hasCustomImages && params.customImages && params.customImages.length > 0 && (
                                <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                                  +{params.customImages.length}
                                </span>
                              )}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  type="button"
                                  className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors text-left"
                                  onClick={() => onPreviewExercise?.(mapping, exerciseOverrides[mapping.id])}
                                >
                                  {exerciseName}
                                </button>
                                {hasOverride && (
                                  <span
                                    className="h-2 w-2 rounded-full bg-primary shrink-0"
                                    title="Zmodyfikowane dla pacjenta"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {params.sets && (
                                  <span className="flex items-center gap-1">
                                    <span className="font-medium text-foreground">{params.sets}</span> serii
                                  </span>
                                )}
                                {params.reps && (
                                  <span className="flex items-center gap-1">
                                    <span className="font-medium text-foreground">{params.reps}</span> powt.
                                  </span>
                                )}
                                {params.executionTime && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Czas powt.:</span>
                                    <span className="font-medium text-foreground">{params.executionTime}</span>s
                                  </span>
                                )}
                                {params.duration && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Czas serii:</span>
                                    <span className="font-medium text-foreground">{formatDurationPolish(params.duration)}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions - Always visible */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => onPreviewExercise?.(mapping, exerciseOverrides[mapping.id])}
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
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => onEditExercise?.(assignment, mapping, exerciseOverrides[mapping.id])}
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
                        );
                      })}

                    {/* Show hidden exercises count */}
                    {hiddenExercisesCount > 0 && (
                      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                        <EyeOff className="h-3.5 w-3.5" />
                        {hiddenExercisesCount} ukrytych ćwiczeń
                        <Button
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
