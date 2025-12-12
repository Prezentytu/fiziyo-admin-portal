"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Dumbbell,
  Plus,
  X,
  Calendar,
  Clock,
  FolderKanban,
  ExternalLink,
  Settings2,
  MoreHorizontal,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SetDialog } from "@/components/exercise-sets/SetDialog";
import { AddExerciseToSetDialog } from "@/components/exercise-sets/AddExerciseToSetDialog";
import { EditExerciseInSetDialog } from "@/components/exercise-sets/EditExerciseInSetDialog";
import { AssignSetDialog } from "@/components/exercise-sets/AssignSetDialog";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import Link from "next/link";

import {
  GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
} from "@/graphql/queries/exerciseSets.queries";
import {
  DELETE_EXERCISE_SET_MUTATION,
  REMOVE_EXERCISE_FROM_SET_MUTATION,
  UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";

// Tłumaczenie typów na polski
const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: "czasowe",
    reps: "powtórzenia",
    hold: "utrzymanie",
  };
  return type ? types[type] || type : "";
};

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ExerciseMapping {
  id: string;
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  notes?: string;
  exercise?: {
    id: string;
    name: string;
    description?: string;
    type?: string;
    imageUrl?: string;
    images?: string[];
    exerciseSide?: string;
  };
}

interface PatientAssignmentInSet {
  id: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  completionCount?: number;
  lastCompletedAt?: string;
  frequency?: {
    timesPerDay?: number;
    timesPerWeek?: number;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
  user?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  };
}

interface ExerciseSetData {
  exerciseSetById: {
    id: string;
    name: string;
    description?: string;
    exerciseMappings?: ExerciseMapping[];
    patientAssignments?: PatientAssignmentInSet[];
    frequency?: {
      timesPerWeek?: number;
      timesPerDay?: number;
    };
  };
}

export default function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] =
    useState<ExerciseMapping | null>(null);
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(
    null
  );
  const [removingAssignment, setRemovingAssignment] = useState<PatientAssignmentInSet | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (
    userData as { userByClerkId?: { id?: string; organizationIds?: string[] } }
  )?.userByClerkId;
  const organizationId = userByClerkId?.organizationIds?.[0];
  const therapistId = userByClerkId?.id;

  // Get set details
  const { data, loading, error, refetch } = useQuery(
    GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
    {
      variables: { exerciseSetId: id },
    }
  );

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(
    DELETE_EXERCISE_SET_MUTATION,
    {
      refetchQueries: organizationId
        ? [
            {
              query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
              variables: { organizationId },
            },
          ]
        : [],
    }
  );

  const [removeExercise, { loading: removingExercise }] = useMutation(
    REMOVE_EXERCISE_FROM_SET_MUTATION
  );

  const [updateAssignment, { loading: updatingAssignment }] = useMutation(
    UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const [removeAssignment, { loading: removingAssignmentLoading }] = useMutation(
    REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const exerciseSet = (data as ExerciseSetData | undefined)?.exerciseSetById;

  const handleDelete = async () => {
    try {
      await deleteSet({
        variables: { exerciseSetId: id },
      });
      toast.success("Zestaw został usunięty");
      router.push("/exercise-sets");
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć zestawu");
    }
  };

  const handleRemoveExercise = async () => {
    if (!removingExerciseId) return;

    try {
      await removeExercise({
        variables: {
          exerciseId: removingExerciseId,
          exerciseSetId: id,
        },
      });
      toast.success("Ćwiczenie zostało usunięte z zestawu");
      setRemovingExerciseId(null);
      refetch();
    } catch (error) {
      console.error("Błąd podczas usuwania ćwiczenia:", error);
      toast.error("Nie udało się usunąć ćwiczenia z zestawu");
    }
  };

  const handleToggleAssignmentStatus = async (assignment: PatientAssignmentInSet) => {
    const newStatus = assignment.status === "active" ? "paused" : "active";
    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          status: newStatus,
        },
      });
      toast.success(newStatus === "active" ? "Przypisanie wznowione" : "Przypisanie wstrzymane");
      refetch();
    } catch (error) {
      console.error("Błąd zmiany statusu:", error);
      toast.error("Nie udało się zmienić statusu");
    }
  };

  const handleRemoveAssignment = async () => {
    if (!removingAssignment) return;

    try {
      await removeAssignment({
        variables: {
          exerciseSetId: id,
          patientId: removingAssignment.userId || removingAssignment.user?.id,
        },
      });
      toast.success("Przypisanie zostało usunięte");
      setRemovingAssignment(null);
      refetch();
    } catch (error) {
      console.error("Błąd usuwania przypisania:", error);
      toast.error("Nie udało się usunąć przypisania");
    }
  };

  // Helper function for status display
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case "active":
        return { label: "Aktywny", variant: "success" as const };
      case "paused":
        return { label: "Wstrzymany", variant: "warning" as const };
      case "completed":
        return { label: "Ukończony", variant: "secondary" as const };
      default:
        return { label: status || "—", variant: "secondary" as const };
    }
  };

  // Helper function for frequency display
  const getFrequencyDisplay = (frequency?: PatientAssignmentInSet["frequency"]) => {
    if (!frequency) return null;
    const days = [
      frequency.monday && "Pn",
      frequency.tuesday && "Wt",
      frequency.wednesday && "Śr",
      frequency.thursday && "Cz",
      frequency.friday && "Pt",
      frequency.saturday && "So",
      frequency.sunday && "Nd",
    ].filter(Boolean);
    
    if (days.length === 7) return "Codziennie";
    if (days.length === 5 && !frequency.saturday && !frequency.sunday) return "Pn-Pt";
    return days.join(", ");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (error || !exerciseSet) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-2">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-destructive">
          {error ? `Błąd: ${error.message}` : "Nie znaleziono zestawu"}
        </p>
        <Button variant="outline" onClick={() => router.push("/exercise-sets")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const exercises = exerciseSet?.exerciseMappings || [];
  const assignments = exerciseSet?.patientAssignments || [];

  // Get first 4 exercise images for hero grid
  const exerciseImages = exercises
    .slice(0, 4)
    .map((m) => m.exercise?.imageUrl || m.exercise?.images?.[0])
    .filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative rounded-2xl overflow-hidden bg-surface-light">
        <div className="relative p-6 md:p-8">
          {/* Navigation and actions */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/exercise-sets")}
              className="bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-black/20 hover:bg-black/40 backdrop-blur-sm border-white/20"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </Button>
            </div>
          </div>

          {/* Main hero content */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Image grid preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
              {exerciseImages.length > 0 ? (
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="relative overflow-hidden">
                      {exerciseImages[index] ? (
                        <img
                          src={exerciseImages[index]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-light flex items-center justify-center">
                          <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <ImagePlaceholder
                  type="set"
                  className="h-full"
                  iconClassName="h-16 w-16"
                />
              )}

              {/* Stats overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm gap-1.5">
                  <Dumbbell className="h-3 w-3" />
                  {exercises.length} ćwiczeń
                </Badge>
                <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm gap-1.5">
                  <Users className="h-3 w-3" />
                  {assignments.length} pacjentów
                </Badge>
              </div>
            </div>

            {/* Set info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{exerciseSet.name}</h1>
                <p className="text-muted-foreground text-lg">
                  {exerciseSet.description || "Brak opisu"}
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                  <div className="stats-icon">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{exercises.length}</p>
                    <p className="text-sm text-muted-foreground">ćwiczeń</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                  <div className="stats-icon-info">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                    <p className="text-sm text-muted-foreground">pacjentów</p>
                  </div>
                </div>
                {exerciseSet?.frequency?.timesPerWeek && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                    <div className="stats-icon-secondary">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {exerciseSet.frequency.timesPerWeek}x
                      </p>
                      <p className="text-sm text-muted-foreground">
                        w tygodniu
                      </p>
                    </div>
                  </div>
                )}
                {exerciseSet?.frequency?.timesPerDay && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                    <div className="stats-icon-warning">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {exerciseSet.frequency.timesPerDay}x
                      </p>
                      <p className="text-sm text-muted-foreground">dziennie</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Exercises list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Ćwiczenia w zestawie
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddExerciseDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Dodaj ćwiczenie
              </Button>
            </CardHeader>
            <CardContent>
              {exercises.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title="Brak ćwiczeń"
                  description="Dodaj ćwiczenia do tego zestawu"
                  actionLabel="Dodaj ćwiczenie"
                  onAction={() => setIsAddExerciseDialogOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {[...exercises]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((mapping, index) => {
                      const imageUrl =
                        mapping.exercise?.imageUrl ||
                        mapping.exercise?.images?.[0];
                      const hasParams =
                        mapping.sets || mapping.reps || mapping.duration;
                      return (
                        <div
                          key={mapping.id}
                          className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-primary/30 hover:bg-surface-light hover:shadow-sm cursor-pointer"
                          onClick={() => setEditingExercise(mapping)}
                        >
                          {/* Order number */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light text-lg font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {index + 1}
                          </div>

                          {/* Thumbnail */}
                          <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={mapping.exercise?.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <ImagePlaceholder
                                type="exercise"
                                iconClassName="h-5 w-5"
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">
                                {mapping.exercise?.name || "Nieznane ćwiczenie"}
                              </p>
                              {mapping.exercise?.type && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] shrink-0"
                                >
                                  {translateType(mapping.exercise.type)}
                                </Badge>
                              )}
                            </div>
                            {hasParams ? (
                              <div className="flex items-center gap-4 text-sm mt-1.5">
                                {mapping.sets && (
                                  <div className="flex items-center gap-1.5 rounded-md bg-surface-light px-2 py-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      Serie
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      {mapping.sets}
                                    </span>
                                  </div>
                                )}
                                {mapping.reps && (
                                  <div className="flex items-center gap-1.5 rounded-md bg-surface-light px-2 py-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      Powt.
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      {mapping.reps}
                                    </span>
                                  </div>
                                )}
                                {mapping.duration && (
                                  <div className="flex items-center gap-1.5 rounded-md bg-surface-light px-2 py-0.5">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">
                                      {mapping.duration}s
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Kliknij aby ustawić parametry
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExercise(mapping);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemovingExerciseId(mapping.exerciseId);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Assigned patients */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Pacjenci ({assignments.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
                className="shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Przypisz
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {assignments.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-14 w-14 rounded-full bg-surface-light mx-auto flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Brak przypisanych pacjentów
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Przypisz ten zestaw do pacjentów
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Przypisz pacjenta
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => {
                    const statusInfo = getStatusInfo(assignment.status);
                    const frequencyDisplay = getFrequencyDisplay(assignment.frequency);
                    
                    return (
                      <div
                        key={assignment.id}
                        className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border/80 hover:bg-surface-light"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={assignment.user?.image} />
                            <AvatarFallback className="bg-gradient-to-br from-info to-blue-600 text-white text-sm font-semibold">
                              {assignment.user?.fullname?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {assignment.user?.fullname || "Nieznany pacjent"}
                              </p>
                              <Badge
                                variant={statusInfo.variant}
                                className="text-[9px] shrink-0"
                              >
                                {statusInfo.label}
                              </Badge>
                            </div>
                            {(frequencyDisplay || assignment.frequency?.timesPerDay) && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {frequencyDisplay && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {frequencyDisplay}
                                  </span>
                                )}
                                {assignment.frequency?.timesPerDay && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {assignment.frequency.timesPerDay}x/dzień
                                  </span>
                                )}
                              </div>
                            )}
                            {assignment.completionCount !== undefined && assignment.completionCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Wykonano: {assignment.completionCount}x
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/patients/${assignment.user?.id}`}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Przejdź do pacjenta
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/patients/${assignment.user?.id}?tab=exercises`}>
                                  <Settings2 className="mr-2 h-4 w-4" />
                                  Zarządzaj zestawem
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleAssignmentStatus(assignment)}
                                disabled={updatingAssignment}
                              >
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
                                onClick={() => setRemovingAssignment(assignment)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Usuń przypisanie
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {organizationId && (
        <SetDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          set={exerciseSet}
          organizationId={organizationId}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Set Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń zestaw"
        description={`Czy na pewno chcesz usunąć zestaw "${exerciseSet.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Remove Exercise Confirmation */}
      <ConfirmDialog
        open={!!removingExerciseId}
        onOpenChange={(open) => !open && setRemovingExerciseId(null)}
        title="Usuń ćwiczenie z zestawu"
        description="Czy na pewno chcesz usunąć to ćwiczenie z zestawu?"
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemoveExercise}
        isLoading={removingExercise}
      />

      {/* Add Exercise Dialog */}
      {organizationId && (
        <AddExerciseToSetDialog
          open={isAddExerciseDialogOpen}
          onOpenChange={setIsAddExerciseDialogOpen}
          exerciseSetId={id}
          organizationId={organizationId}
          existingExerciseIds={exercises.map((m) => m.exerciseId)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Edit Exercise Dialog */}
      <EditExerciseInSetDialog
        open={!!editingExercise}
        onOpenChange={(open) => !open && setEditingExercise(null)}
        exerciseMapping={editingExercise}
        exerciseSetId={id}
        onSuccess={() => refetch()}
      />

      {/* Assign Patients Dialog */}
      {organizationId && therapistId && (
        <AssignSetDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          exerciseSetId={id}
          assignedPatientIds={assignments.map(
            (a) => a.userId || a.user?.id || ""
          )}
          therapistId={therapistId}
          organizationId={organizationId}
          onSuccess={() => refetch()}
        />
      )}

      {/* Remove Assignment Confirmation */}
      <ConfirmDialog
        open={!!removingAssignment}
        onOpenChange={(open) => !open && setRemovingAssignment(null)}
        title="Usuń przypisanie"
        description={`Czy na pewno chcesz usunąć przypisanie zestawu dla pacjenta "${removingAssignment?.user?.fullname || "Nieznany"}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemoveAssignment}
        isLoading={removingAssignmentLoading}
      />
    </div>
  );
}
