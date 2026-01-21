'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
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
  Wrench,
  UserPlus,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { translateAssignmentStatus, type AssignmentStatus } from '@/utils/statusUtils';
import { pluralize } from '@/utils/textUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SetDialog } from '@/components/exercise-sets/SetDialog';
import { AddExerciseToSetDialog } from '@/components/exercise-sets/AddExerciseToSetDialog';
import { EditExerciseInSetDialog } from '@/components/exercise-sets/EditExerciseInSetDialog';
import { GeneratePDFDialog } from '@/components/exercise-sets/GeneratePDFDialog';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import type { ExerciseSet as AssignmentExerciseSet } from '@/components/assignment/types';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';

import {
  GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
} from '@/graphql/queries/exerciseSets.queries';
import {
  DELETE_EXERCISE_SET_MUTATION,
  REMOVE_EXERCISE_FROM_SET_MUTATION,
  UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { useOrganization } from '@/contexts/OrganizationContext';
import { translateExerciseTypeShort } from '@/components/pdf/polishUtils';

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
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    // Nowe pola
    patientDescription?: string;
    side?: string;
    thumbnailUrl?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    // Legacy aliasy
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
    isShadowUser?: boolean;
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
  const { currentOrganization } = useOrganization();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseMapping | null>(null);
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null);
  const [removingAssignment, setRemovingAssignment] = useState<PatientAssignmentInSet | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as { userByClerkId?: { id?: string } })?.userByClerkId;
  const therapistId = userByClerkId?.id;

  // Get set details
  const { data, loading, error, refetch } = useQuery(GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, {
    variables: { exerciseSetId: id },
  });

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(DELETE_EXERCISE_SET_MUTATION, {
    refetchQueries: organizationId
      ? [
          {
            query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
            variables: { organizationId },
          },
        ]
      : [],
  });

  const [removeExercise, { loading: removingExercise }] = useMutation(REMOVE_EXERCISE_FROM_SET_MUTATION);

  const [updateAssignment, { loading: updatingAssignment }] = useMutation(UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION);

  const [removeAssignment, { loading: removingAssignmentLoading }] = useMutation(
    REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const exerciseSet = (data as ExerciseSetData | undefined)?.exerciseSetById;

  const handleDelete = async () => {
    try {
      await deleteSet({
        variables: { exerciseSetId: id },
      });
      toast.success('Zestaw został usunięty');
      router.push('/exercise-sets');
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć zestawu');
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
      toast.success('Ćwiczenie zostało usunięte z zestawu');
      setRemovingExerciseId(null);
      refetch();
    } catch (err) {
      console.error('Błąd podczas usuwania ćwiczenia:', err);
      toast.error('Nie udało się usunąć ćwiczenia z zestawu');
    }
  };

  const handleToggleAssignmentStatus = async (assignment: PatientAssignmentInSet) => {
    const newStatus = assignment.status === 'active' ? 'paused' : 'active';
    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          status: newStatus,
        },
      });
      toast.success(newStatus === 'active' ? 'Przypisanie wznowione' : 'Przypisanie wstrzymane');
      refetch();
    } catch (err) {
      console.error('Błąd zmiany statusu:', err);
      toast.error('Nie udało się zmienić statusu');
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
      toast.success('Przypisanie zostało usunięte');
      setRemovingAssignment(null);
      refetch();
    } catch (err) {
      console.error('Błąd usuwania przypisania:', err);
      toast.error('Nie udało się usunąć przypisania');
    }
  };

  // Helper function for status display
  const getStatusInfo = (status?: string) => {
    const safeStatus = (status || 'assigned') as AssignmentStatus;
    const label = translateAssignmentStatus(safeStatus);
    let variant: 'success' | 'warning' | 'secondary' = 'secondary';

    switch (status) {
      case 'active':
        variant = 'success';
        break;
      case 'paused':
        variant = 'warning';
        break;
      case 'completed':
        variant = 'secondary';
        break;
    }

    return { label, variant };
  };

  // Helper function for frequency display
  const getFrequencyDisplay = (frequency?: PatientAssignmentInSet['frequency']) => {
    if (!frequency) return null;
    const days = [
      frequency.monday && 'Pn',
      frequency.tuesday && 'Wt',
      frequency.wednesday && 'Śr',
      frequency.thursday && 'Cz',
      frequency.friday && 'Pt',
      frequency.saturday && 'So',
      frequency.sunday && 'Nd',
    ].filter(Boolean);

    if (days.length === 7) return 'Codziennie';
    if (days.length === 5 && !frequency.saturday && !frequency.sunday) return 'Pn-Pt';
    return days.join(', ');
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
        <p className="text-destructive">{error ? `Błąd: ${error.message}` : 'Nie znaleziono zestawu'}</p>
        <Button variant="outline" onClick={() => router.push('/exercise-sets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const exercises = exerciseSet?.exerciseMappings || [];
  const assignments = exerciseSet?.patientAssignments || [];

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/exercise-sets')} className="gap-2" data-testid="set-detail-back-btn">
          <ArrowLeft className="h-4 w-4" />
          Powrót do zestawów
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="set-detail-menu-trigger">
              Opcje
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsPDFDialogOpen(true)} data-testid="set-detail-pdf-btn">
              <FileDown className="mr-2 h-4 w-4" />
              Pobierz PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} data-testid="set-detail-edit-btn">
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj zestaw
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
              data-testid="set-detail-delete-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń zestaw
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Section: Title + Description */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground" data-testid="set-detail-name">{exerciseSet.name}</h1>
        {exerciseSet.description && (
          <p className="text-muted-foreground">{exerciseSet.description}</p>
        )}
      </div>

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Przypisz pacjenta */}
        <button
          onClick={() => setIsAssignDialogOpen(true)}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1 lg:col-span-4"
          data-testid="set-detail-assign-btn"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Przypisz pacjenta
              </h3>
              <p className="text-sm text-white/70">
                Dodaj do programu
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 sm:col-span-1 lg:col-span-8">
          {/* Exercises count */}
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{exercises.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pluralize(exercises.length, 'ćwiczenie', false)}</p>
          </div>

          {/* Patients count */}
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" />
              <span className="text-2xl font-bold text-foreground">{assignments.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pluralize(assignments.length, 'pacjent', false)}</p>
          </div>

          {/* Frequency */}
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-info" />
              <span className="text-lg font-bold text-foreground">
                {exerciseSet?.frequency?.timesPerWeek ? `${exerciseSet.frequency.timesPerWeek}x` : '—'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {exerciseSet?.frequency?.timesPerDay
                ? `${exerciseSet.frequency.timesPerDay}x/dzień`
                : 'tygodniowo'}
            </p>
          </div>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Ćwiczenia ({exercises.length})
          </h2>
          <Button size="sm" onClick={() => setIsAddExerciseDialogOpen(true)} data-testid="set-detail-add-exercise-btn">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj
          </Button>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-12">
            <EmptyState
              icon={Dumbbell}
              title="Brak ćwiczeń"
              description="Dodaj ćwiczenia do tego zestawu"
              actionLabel="Dodaj ćwiczenie"
              onAction={() => setIsAddExerciseDialogOpen(true)}
            />
          </div>
        ) : (
          <div className="space-y-2 animate-stagger">
            {[...exercises]
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((mapping, index) => {
                const imageUrl = getMediaUrl(mapping.exercise?.imageUrl || mapping.exercise?.images?.[0]);
                const hasParams = mapping.sets || mapping.reps || mapping.duration;
                return (
                  <div
                    key={mapping.id}
                    className="group flex items-center gap-4 rounded-xl border border-border/60 bg-surface p-4 transition-all duration-200 hover:border-primary/30 hover:bg-surface-light cursor-pointer"
                    onClick={() => setEditingExercise(mapping)}
                  >
                    {/* Order number */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light text-lg font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-surface-light">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={mapping.exercise?.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{mapping.customName || mapping.exercise?.name || 'Nieznane ćwiczenie'}</p>
                        {mapping.customName && (
                          <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">
                            zmieniona
                          </Badge>
                        )}
                        {mapping.exercise?.type && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {translateExerciseTypeShort(mapping.exercise.type)}
                          </Badge>
                        )}
                      </div>
                      {hasParams ? (
                        <div className="flex items-center gap-3 text-sm mt-1.5">
                          {mapping.sets && (
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{mapping.sets}</span> serii
                            </span>
                          )}
                          {mapping.reps && (
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{mapping.reps}</span> powt.
                            </span>
                          )}
                          {mapping.duration && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="font-semibold text-foreground">{mapping.duration}s</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Kliknij aby ustawić parametry</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
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
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
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
      </div>

      {/* Patients Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            Przypisani pacjenci ({assignments.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setIsAssignDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Przypisz
          </Button>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-12">
            <EmptyState
              icon={Users}
              title="Brak przypisanych pacjentów"
              description="Przypisz ten zestaw do pacjentów"
              actionLabel="Przypisz pacjenta"
              onAction={() => setIsAssignDialogOpen(true)}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
            {assignments.map((assignment) => {
              const statusInfo = getStatusInfo(assignment.status);
              const frequencyDisplay = getFrequencyDisplay(assignment.frequency);

              return (
                <div
                  key={assignment.id}
                  className="group rounded-xl border border-border/60 bg-surface p-4 transition-all duration-200 hover:border-primary/30 hover:bg-surface-light"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar
                        className={cn(
                          'h-11 w-11 ring-2 transition-all',
                          assignment.user?.isShadowUser ? 'ring-muted-foreground/20' : 'ring-border/30'
                        )}
                      >
                        <AvatarImage src={assignment.user?.image} />
                        <AvatarFallback
                          className={cn(
                            'text-sm font-semibold',
                            assignment.user?.isShadowUser
                              ? 'bg-muted-foreground/60 text-white'
                              : 'bg-gradient-to-br from-info to-blue-600 text-white'
                          )}
                        >
                          {assignment.user?.fullname?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {assignment.user?.isShadowUser && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-surface">
                          <Wrench className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {assignment.user?.fullname || 'Nieznany pacjent'}
                        </p>
                        <Badge variant={statusInfo.variant} className="text-[9px] shrink-0">
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

      {/* Assignment Wizard */}
      {organizationId && therapistId && exerciseSet && (
        <AssignmentWizard
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          mode="from-set"
          preselectedSet={{
            id: exerciseSet.id,
            name: exerciseSet.name,
            description: exerciseSet.description,
            exerciseMappings: exerciseSet.exerciseMappings?.map((m) => ({
              id: m.id,
              exerciseId: m.exerciseId,
              order: m.order,
              sets: m.sets,
              reps: m.reps,
              duration: m.duration,
              restSets: m.restSets,
              restReps: m.restReps,
              notes: m.notes,
              exercise: m.exercise ? {
                id: m.exercise.id,
                name: m.exercise.name,
                description: m.exercise.patientDescription || m.exercise.description,
                patientDescription: m.exercise.patientDescription,
                type: m.exercise.type,
                imageUrl: m.exercise.thumbnailUrl || m.exercise.imageUrl,
                thumbnailUrl: m.exercise.thumbnailUrl,
                images: m.exercise.images,
                side: m.exercise.side,
                exerciseSide: m.exercise.side?.toLowerCase() || m.exercise.exerciseSide,
              } : undefined,
            })),
          } as AssignmentExerciseSet}
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => refetch()}
        />
      )}

      {/* Remove Assignment Confirmation */}
      <ConfirmDialog
        open={!!removingAssignment}
        onOpenChange={(open) => !open && setRemovingAssignment(null)}
        title="Usuń przypisanie"
        description={`Czy na pewno chcesz usunąć przypisanie zestawu dla pacjenta "${
          removingAssignment?.user?.fullname || 'Nieznany'
        }"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemoveAssignment}
        isLoading={removingAssignmentLoading}
      />

      {/* Generate PDF Dialog */}
      {organizationId && exerciseSet && (
        <GeneratePDFDialog
          open={isPDFDialogOpen}
          onOpenChange={setIsPDFDialogOpen}
          exerciseSet={exerciseSet}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
