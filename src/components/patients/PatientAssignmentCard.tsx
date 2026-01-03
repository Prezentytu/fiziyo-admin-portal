"use client";

import * as React from "react";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
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
  Settings2,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import { translateAssignmentStatus, getStatusColorClass } from "@/utils/statusUtils";
import { getMediaUrl } from "@/utils/mediaUrl";

import {
  UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";

// Types
export interface Frequency {
  timesPerDay?: number;
  timesPerWeek?: number;
  breakBetweenSets?: number;
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
  restSets?: number;
  restReps?: number;
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    type?: string;
    exerciseSide?: string;
    imageUrl?: string;
    images?: string[];
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
  hidden?: boolean;
  customName?: string;
  customDescription?: string;
  notes?: string;
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
    exerciseMappings?: ExerciseMapping[];
  };
}

interface PatientAssignmentCardProps {
  assignment: PatientAssignment;
  patientId: string;
  onEditSchedule?: (assignment: PatientAssignment) => void;
  onEditExercise?: (assignment: PatientAssignment, mapping: ExerciseMapping, override?: ExerciseOverride) => void;
  onAddExercise?: (assignment: PatientAssignment) => void;
  onGeneratePDF?: (assignment: PatientAssignment) => void;
  onRefresh?: () => void;
}

// Helper functions
const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: "czasowe",
    reps: "powtórzenia",
  };
  return type ? types[type] || type : "";
};

const getActiveDays = (frequency?: Frequency): string => {
  if (!frequency) return "Brak harmonogramu";

  const days: string[] = [];
  if (frequency.monday) days.push("Pn");
  if (frequency.tuesday) days.push("Wt");
  if (frequency.wednesday) days.push("Śr");
  if (frequency.thursday) days.push("Cz");
  if (frequency.friday) days.push("Pt");
  if (frequency.saturday) days.push("So");
  if (frequency.sunday) days.push("Nd");

  if (days.length === 7) return "Codziennie";
  if (days.length === 5 && !frequency.saturday && !frequency.sunday) return "Pn-Pt";
  if (days.length === 0) return "Brak dni";

  return days.join(", ");
};

const getStatusVariant = (status?: string): "success" | "secondary" | "warning" | "destructive" | "default" => {
  switch (status) {
    case "assigned":
      return "default";
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

export function PatientAssignmentCard({
  assignment,
  patientId,
  onEditSchedule,
  onEditExercise,
  onAddExercise,
  onGeneratePDF,
  onRefresh,
}: PatientAssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  const [updateAssignment, { loading: updating }] = useMutation(
    UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const [updateOverrides] = useMutation(
    UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION
  );

  const [removeAssignment, { loading: removing }] = useMutation(
    REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const exerciseSet = assignment.exerciseSet;
  const exercises = exerciseSet?.exerciseMappings || [];
  const visibleExercises = exercises.filter((m) => {
    const override = exerciseOverrides[m.id];
    return !override?.hidden;
  });

  // Handlers
  const handleToggleStatus = async () => {
    const newStatus = assignment.status === "active" ? "paused" : "active";
    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          status: newStatus,
        },
        refetchQueries: [
          { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } },
        ],
      });
      toast.success(newStatus === "active" ? "Zestaw wznowiony" : "Zestaw wstrzymany");
      onRefresh?.();
    } catch (error) {
      console.error("Błąd zmiany statusu:", error);
      toast.error("Nie udało się zmienić statusu");
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
        refetchQueries: [
          { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } },
        ],
      });
      toast.success(currentOverride.hidden ? "Ćwiczenie pokazane" : "Ćwiczenie ukryte");
      onRefresh?.();
    } catch (error) {
      console.error("Błąd zmiany widoczności:", error);
      toast.error("Nie udało się zmienić widoczności ćwiczenia");
    }
  };

  const handleDelete = async () => {
    if (!exerciseSet) return;
    try {
      await removeAssignment({
        variables: {
          exerciseSetId: exerciseSet.id,
          patientId,
        },
        refetchQueries: [
          { query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, variables: { userId: patientId } },
        ],
      });
      toast.success("Przypisanie zostało usunięte");
      setIsDeleteDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd usuwania:", error);
      toast.error("Nie udało się usunąć przypisania");
    }
  };

  // Get effective exercise params (with overrides)
  const getEffectiveParams = (mapping: ExerciseMapping) => {
    const override = exerciseOverrides[mapping.id];
    return {
      sets: override?.sets ?? mapping.sets ?? mapping.exercise?.sets,
      reps: override?.reps ?? mapping.reps ?? mapping.exercise?.reps,
      duration: override?.duration ?? mapping.duration ?? mapping.exercise?.duration,
      customName: override?.customName ?? mapping.customName,
      hidden: override?.hidden ?? false,
    };
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={cn(
          "transition-all duration-200 border-border/60",
          isExpanded && "ring-1 ring-primary/20 border-primary/30"
        )}>
          {/* Header - always visible */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-light/50 transition-colors">
              {/* Expand icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-light text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>

              {/* Set thumbnail */}
              <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-surface-light">
                {getMediaUrl(exercises[0]?.exercise?.imageUrl || exercises[0]?.exercise?.images?.[0]) ? (
                  <img
                    src={getMediaUrl(exercises[0]?.exercise?.imageUrl || exercises[0]?.exercise?.images?.[0]) || ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlaceholder type="set" iconClassName="h-5 w-5" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">
                    {exerciseSet?.name || "Nieznany zestaw"}
                  </p>
                  <Badge variant={getStatusVariant(assignment.status)} className="text-[10px] shrink-0">
                    {translateAssignmentStatus(assignment.status as any)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {visibleExercises.length} ćwiczeń
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {getActiveDays(assignment.frequency)}
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
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onGeneratePDF?.(assignment)}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Pobierz PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditSchedule?.(assignment)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Edytuj harmonogram
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleStatus} disabled={updating}>
                      {assignment.status === "active" ? (
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
            <CardContent className="pt-0 pb-4">
              {/* Schedule info */}
              <div className="mb-4 p-3 rounded-xl bg-surface-light/50 border border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Harmonogram
                    </p>
                    <p className="text-sm">
                      {assignment.startDate && (
                        <>
                          {format(new Date(assignment.startDate), "d MMM yyyy", { locale: pl })}
                          {assignment.endDate && (
                            <> — {format(new Date(assignment.endDate), "d MMM yyyy", { locale: pl })}</>
                          )}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getActiveDays(assignment.frequency)}
                      {assignment.frequency?.timesPerDay && assignment.frequency.timesPerDay > 1 && (
                        <>, {assignment.frequency.timesPerDay}x dziennie</>
                      )}
                      {assignment.frequency?.breakBetweenSets && (
                        <>, min. {assignment.frequency.breakBetweenSets}h między sesjami</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditSchedule?.(assignment)}
                    className="shrink-0"
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                </div>
              </div>

              {/* Exercises list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ćwiczenia ({exercises.length})
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddExercise?.(assignment)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Dodaj
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {[...exercises]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((mapping) => {
                      const params = getEffectiveParams(mapping);
                      const imageUrl = getMediaUrl(mapping.exercise?.imageUrl || mapping.exercise?.images?.[0]);
                      const hasOverride = exerciseOverrides[mapping.id] && (
                        exerciseOverrides[mapping.id].sets !== undefined ||
                        exerciseOverrides[mapping.id].reps !== undefined ||
                        exerciseOverrides[mapping.id].duration !== undefined ||
                        exerciseOverrides[mapping.id].customName
                      );

                      return (
                        <div
                          key={mapping.id}
                          className={cn(
                            "group flex items-center gap-3 p-2.5 rounded-lg border border-transparent transition-all",
                            params.hidden
                              ? "opacity-50 bg-surface-light/30"
                              : "hover:bg-surface-light hover:border-border/40"
                          )}
                        >
                          {/* Thumbnail */}
                          <div className={cn(
                            "h-10 w-10 rounded-lg overflow-hidden shrink-0",
                            params.hidden && "grayscale"
                          )}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                params.hidden && "line-through"
                              )}>
                                {params.customName || mapping.exercise?.name || "Nieznane"}
                              </p>
                              {hasOverride && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Zmodyfikowane" />
                              )}
                              {mapping.exercise?.type && (
                                <Badge variant="secondary" className="text-[9px] shrink-0">
                                  {translateType(mapping.exercise.type)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {params.sets && (
                                <span className="text-xs text-muted-foreground">
                                  {params.sets} serii
                                </span>
                              )}
                              {params.reps && (
                                <span className="text-xs text-muted-foreground">
                                  × {params.reps} powt.
                                </span>
                              )}
                              {params.duration && (
                                <span className="text-xs text-muted-foreground">
                                  × {params.duration}s
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEditExercise?.(assignment, mapping, exerciseOverrides[mapping.id])}
                              title="Edytuj parametry"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleExerciseVisibility(mapping.id)}
                              title={params.hidden ? "Pokaż ćwiczenie" : "Ukryj ćwiczenie"}
                            >
                              {params.hidden ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Stats */}
              {(assignment.completionCount !== undefined && assignment.completionCount > 0) && (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Wykonano: <span className="font-medium text-foreground">{assignment.completionCount}</span> razy
                    {assignment.lastCompletedAt && (
                      <> • Ostatnio: {format(new Date(assignment.lastCompletedAt), "d MMM", { locale: pl })}</>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń przypisanie"
        description={`Czy na pewno chcesz usunąć przypisanie zestawu "${exerciseSet?.name}" dla tego pacjenta? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={removing}
      />
    </>
  );
}
