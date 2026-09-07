'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  FolderKanban,
  FolderPlus,
  Users,
  ChevronRight,
  Send,
  UserPlus,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageHero } from '@/components/shared/page/PageHero';
import { EmptyState } from '@/components/shared/EmptyState';
import { SetThumbnail } from '@/features/exercise-sets/SetThumbnail';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { normalizeFrequencySeed } from '@/features/assignment/utils/scheduleFrequencyUtils';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';
import { GettingStartedCard } from '@/components/onboarding/GettingStartedCard';
import { BillingStatusBar } from '@/components/billing';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';
import { useRealtimeExerciseSets } from '@/hooks/useRealtimeExerciseSets';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type {
  OrganizationExerciseSetsResponse,
  OrganizationPatientDto,
  OrganizationPatientsResponse,
} from '@/types/apollo';

interface ExerciseSetItem {
  id: string;
  name: string;
  description?: string;
  creationTime?: string;
  kind?: 'TEMPLATE' | 'PATIENT_PLAN';
  isTemplate?: boolean;
  frequency?: {
    timesPerDay?: number | string;
    timesPerWeek?: number | string;
    breakBetweenSets?: number | string;
    isFlexible?: boolean;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
  exerciseMappings?: Array<{
    id: string;
    exerciseId: string;
    exercise?: {
      id: string;
      name: string;
      imageUrl?: string;
      images?: string[];
    };
  }>;
}

interface PatientAssignmentData {
  id: string;
  assignmentId?: string;
  assignmentStatus?: string;
  assignedAt?: string;
  contextLabel?: string;
  patient?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
    isShadowUser?: boolean;
  };
  lastActivity?: string;
}

interface ExerciseAssignment {
  id: string;
  userId: string;
  exerciseSetId?: string;
  assignedById?: string;
  lastCompletedAt?: string;
  completionCount?: number;
  status?: string;
  exerciseSet?: {
    name?: string;
  };
}

// Activity status types
type ActivityStatus = 'active' | 'warning' | 'inactive';

interface PatientWithActivity extends PatientAssignmentData {
  activityStatus: ActivityStatus;
  lastActivityText: string;
  lastActivityDate?: Date;
}

// Format date in Polish
function formatPolishDate(date: Date): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

// Format relative time in Polish
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'przed chwilą';
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return `${Math.floor(diffDays / 7)} tyg. temu`;
}

// Determine activity status based on last activity
function getActivityStatus(lastCompletedAt?: string): { status: ActivityStatus; text: string; date?: Date } {
  if (!lastCompletedAt) {
    return { status: 'inactive', text: 'Brak aktywności' };
  }

  const lastDate = new Date(lastCompletedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return { status: 'active', text: `Ćwiczył ${formatRelativeTime(lastDate)}`, date: lastDate };
  }
  if (diffDays <= 3) {
    return { status: 'warning', text: `Nieaktywny od ${diffDays} dni`, date: lastDate };
  }
  return { status: 'inactive', text: `Nieaktywny od ${diffDays} dni`, date: lastDate };
}

function getGreeting(currentHour: number): string {
  if (currentHour < 12) return 'Dzień dobry';
  if (currentHour < 18) return 'Cześć';
  return 'Dobry wieczór';
}

function getDashboardSubtitle(patientsCount: number, patientsNeedingAttentionCount: number): string {
  if (patientsCount === 0) {
    return 'Nie masz jeszcze przypisanych pacjentów';
  }

  if (patientsNeedingAttentionCount > 0) {
    return patientsNeedingAttentionCount === 1
      ? 'Sprawdź, co u Twojego pacjenta'
      : `Sprawdź, co u ${patientsNeedingAttentionCount} pacjentów`;
  }

  return 'Wszyscy Twoi pacjenci są aktywni';
}

// Activity status indicator component - use design tokens
function ActivityIndicator({ status }: { readonly status: ActivityStatus }) {
  switch (status) {
    case 'active':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-success-muted flex items-center justify-center ring-2 ring-background">
          <CheckCircle2 className="h-2.5 w-2.5 text-success" />
        </div>
      );
    case 'warning':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-warning-muted flex items-center justify-center ring-2 ring-background">
          <AlertCircle className="h-2.5 w-2.5 text-warning" />
        </div>
      );
    case 'inactive':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      );
  }
}

export function DashboardHomePage() {
  const { user } = useUser();
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();
  const { currentOrganization } = useOrganization();
  const { canViewBilling } = useRoleAccess();
  const [isAssignWizardOpen, setIsAssignWizardOpen] = useState(false);
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [quickAssignSet, setQuickAssignSet] = useState<ExerciseSetItem | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  const therapistId = currentUser?.id;
  const userName = currentUser?.fullname || currentUser?.personalData?.firstName || user?.firstName || 'Użytkownik';

  // Get exercise sets
  const { data: setsData, loading: setsLoading } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get patients assigned to the current therapist within the active organization
  const { data: patientsData, loading: patientsLoading } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'my' },
    skip: !organizationId,
  });

  // Get all assignments for activity data
  const { data: assignmentsData } = useQuery(GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY, {
    variables: { assignedById: therapistId || '' },
    skip: !therapistId,
    fetchPolicy: 'cache-and-network',
  });

  // Real-time updates - automatycznie odświeżają Apollo Cache
  useRealtimePatients({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  useRealtimeExerciseSets({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  const exerciseSets = useMemo(
    () => ((setsData as OrganizationExerciseSetsResponse | undefined)?.exerciseSets ?? []) as ExerciseSetItem[],
    [setsData]
  );
  const setsCount = exerciseSets.length;

  const quickSelectionSets = useMemo(
    () =>
      exerciseSets
        .filter((set: ExerciseSetItem) => set.kind === 'TEMPLATE' || set.isTemplate === true)
        .sort((a: ExerciseSetItem, b: ExerciseSetItem) => {
          const dateA = new Date(a.creationTime || 0).getTime();
          const dateB = new Date(b.creationTime || 0).getTime();
          return dateB - dateA;
        }),
    [exerciseSets]
  );

  const patients = useMemo<PatientAssignmentData[]>(() => {
    const organizationPatients = (patientsData as OrganizationPatientsResponse | undefined)?.organizationPatients ?? [];

    return organizationPatients.map((item: OrganizationPatientDto) => ({
      id: item.assignmentId ?? item.patient.id,
      assignmentId: item.assignmentId,
      assignmentStatus: item.assignmentStatus,
      assignedAt: item.assignedAt,
      contextLabel: item.contextLabel,
      patient: {
        id: item.patient.id,
        fullname: item.patient.fullname,
        email: item.patient.email,
        image: item.patient.image,
        isShadowUser: item.patient.isShadowUser,
      },
      lastActivity: item.lastActivity,
    }));
  }, [patientsData]);
  const patientsCount = patients.length;

  // Get assignments with activity data
  const allAssignments = (assignmentsData as { patientAssignments?: ExerciseAssignment[] })?.patientAssignments || [];
  const therapistAssignmentsCount = allAssignments.filter(
    (a) => a.exerciseSetId && a.assignedById === therapistId
  ).length;

  // Enhance patients with activity status and sort by priority
  const patientsWithActivity: PatientWithActivity[] = useMemo(() => {
    const enhanced = patients.map((assignment: PatientAssignmentData) => {
      const { status, text, date } = getActivityStatus(assignment.lastActivity);

      return {
        ...assignment,
        activityStatus: status,
        lastActivityText: text,
        lastActivityDate: date,
      };
    });

    // Sort: newly added (no activity) first, then warning, inactive, active
    // Newly added patients without any activity should appear at the top
    return enhanced.sort((a, b) => {
      const aHasNoActivity = !a.lastActivityDate;
      const bHasNoActivity = !b.lastActivityDate;

      // Patients without any activity (newly added) go first
      if (aHasNoActivity && !bHasNoActivity) return -1;
      if (!aHasNoActivity && bHasNoActivity) return 1;

      // Both have no activity - sort by assignedAt (newest first)
      if (aHasNoActivity && bHasNoActivity) {
        const aAssigned = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const bAssigned = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return bAssigned - aAssigned;
      }

      // Both have activity - sort by status priority, then by date
      const priorityOrder: Record<ActivityStatus, number> = { warning: 0, inactive: 1, active: 2 };
      const priorityDiff = priorityOrder[a.activityStatus] - priorityOrder[b.activityStatus];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by date (most recent first)
      if (a.lastActivityDate && b.lastActivityDate) {
        return b.lastActivityDate.getTime() - a.lastActivityDate.getTime();
      }
      return 0;
    });
  }, [patients]);

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting = getGreeting(currentHour);
  const todayDate = formatPolishDate(new Date());

  // Patients needing attention (warning or inactive)
  const patientsNeedingAttention = patientsWithActivity.filter((p) => p.activityStatus !== 'active');
  const displayedPatients = patientsWithActivity.slice(0, 5);
  const dashboardSubtitle = getDashboardSubtitle(patientsCount, patientsNeedingAttention.length);

  // Show skeleton while initial data is loading
  const isInitialLoading = !user || userLoading || !organizationId;

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  // Handle quick assign from set
  const handleQuickAssign = (set: ExerciseSetItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickAssignSet(set);
    setIsAssignWizardOpen(true);
  };

  return (
    <div data-redesign-surface="dashboard" className="@container/dashboard mx-auto w-full min-w-0 max-w-screen-2xl space-y-6 text-foreground">
      <div data-redesign-part="dashboard-heading" className="space-y-3">
        <p className="text-sm text-muted-foreground">{todayDate}</p>
        <PageHeader
          className="redesign-dashboard-title"
          title={`${greeting}, ${userName}!`}
          titleTestId="dashboard-greeting"
          description={dashboardSubtitle}
          actions={
            <PageHero
              variant="toolbar"
              title="Personalizuj i przypisz"
              description="Personalizuj i przypisz zestaw ćwiczeń pacjentowi"
              icon={<Send />}
              onClick={() => setIsAssignWizardOpen(true)}
              disabled={!organizationId || !therapistId}
              testId="dashboard-hero-assign-set-btn"
              className="h-auto min-h-11 max-w-full whitespace-normal"
            />
          }
        />
      </div>

      {/* Getting Started Card - Onboarding for new users */}
      <GettingStartedCard
        patientsCount={patientsCount}
        exerciseSetsCount={setsCount}
        assignmentsCount={therapistAssignmentsCount}
      />

      <div data-redesign-part="dashboard-columns" className="grid items-start gap-8 @4xl/dashboard:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <div className="min-w-0 flex flex-col gap-6">
          <section
            data-testid="dashboard-activity-section"
            aria-labelledby="dashboard-activity-title"
            className="min-w-0"
          >
            <header className="mb-2 border-b border-border pb-2">
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2
                  id="dashboard-activity-title"
                  className="flex min-w-0 items-center gap-2 text-base font-semibold"
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 wrap-anywhere">Pacjenci do sprawdzenia</span>
                  {patientsNeedingAttention.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-muted text-foreground border-transparent font-medium tabular-nums"
                    >
                      {patientsNeedingAttention.length}
                    </Badge>
                  )}
                </h2>
                <Button
                  data-testid="dashboard-add-patient-btn"
                  type="button"
                  variant="outline"
                  onClick={() => setIsPatientDialogOpen(true)}
                  disabled={!organizationId || !therapistId}
                  aria-label="Dodaj nowego pacjenta do bazy"
                  className="h-auto min-h-11 max-w-full whitespace-normal"
                >
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span
                    data-testid={
                      !patientsLoading && patients.length === 0 ? 'common-dashboard-home-page-btn-606' : undefined
                    }
                    className="min-w-0 wrap-anywhere"
                  >
                    Nowy pacjent
                  </span>
                </Button>
              </div>
            </header>
            <div>
              {patientsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-3" style={{ animationDelay: `${i * 50}ms` }}>
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32 max-w-full rounded-sm" />
                        <Skeleton className="h-3 w-48 max-w-full rounded-sm" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded shrink-0" />
                    </div>
                  ))}
                </div>
              ) : patients.length > 0 ? (
                <div data-redesign-part="patient-list" className="divide-y divide-border/60">
                  {displayedPatients.map((assignment: PatientWithActivity) => {
                    const isShadow = assignment.patient?.isShadowUser;
                    return (
                      <Link
                        key={assignment.id}
                        href={`/patients/${assignment.patient?.id}`}
                        data-testid={`dashboard-patient-item-${assignment.patient?.id}`}
                        data-redesign-part="patient-row"
                        className="group flex min-h-20 items-center gap-3 rounded-sm py-4 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={assignment.patient?.image}
                              alt={assignment.patient?.fullname || 'Nieznany'}
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                              {assignment.patient?.fullname?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {isShadow ? (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
                              <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                          ) : (
                            <ActivityIndicator status={assignment.activityStatus} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-base text-foreground wrap-anywhere">
                            {assignment.patient?.fullname || 'Nieznany'}
                          </p>
                          <p className="text-sm text-muted-foreground wrap-anywhere">{assignment.lastActivityText}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Brak przypisanych pacjentów"
                  density="inline"
                  className="flex min-h-20 items-center py-4"
                />
              )}
            </div>
            <Button
              data-testid="dashboard-patients-view-all"
              variant="ghost"
              size="sm"
              asChild
              className="mt-2 h-auto min-h-11 max-w-full justify-start gap-1 px-0 text-sm text-muted-foreground whitespace-normal hover:text-foreground"
            >
              <Link href="/patients">
                <span data-testid="page-button-487" className="wrap-anywhere">
                  Wszyscy ({patientsCount})
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </Button>
          </section>
        </div>

        <div data-redesign-part="dashboard-library" className="min-w-0 space-y-6">
          <section data-testid="dashboard-sets-section" aria-labelledby="dashboard-sets-title" className="min-w-0">
            <header className="mb-2 border-b border-border pb-2">
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 id="dashboard-sets-title" className="flex min-w-0 items-center gap-2 text-base font-semibold">
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="wrap-anywhere">Zestawy ćwiczeń</span>
                </h2>
                <Button
                  data-testid="dashboard-create-set-btn"
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSetWizardOpen(true)}
                  disabled={!organizationId}
                  aria-label="Utwórz nowy zestaw ćwiczeń"
                  className="h-auto min-h-11 max-w-full whitespace-normal"
                >
                  <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span
                    data-testid={!setsLoading && quickSelectionSets.length === 0 ? 'page-button-712' : undefined}
                    className="min-w-0 wrap-anywhere"
                  >
                    Utwórz zestaw
                  </span>
                </Button>
              </div>
            </header>
            <div>
              {setsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-3"
                      style={{ animationDelay: `${(i + 4) * 50}ms` }}
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden grid grid-cols-2 gap-0.5 shrink-0">
                        <Skeleton className="rounded-none" />
                        <Skeleton className="rounded-none" />
                        <Skeleton className="rounded-none" />
                        <Skeleton className="rounded-none" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-24 max-w-full rounded-sm" />
                        <Skeleton className="h-3 w-16 max-w-full rounded-sm" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : quickSelectionSets.length > 0 ? (
                <TooltipProvider>
                  <div data-redesign-part="set-list" className="divide-y divide-border/60">
                    {quickSelectionSets.slice(0, 5).map((set: ExerciseSetItem) => (
                      <div
                        key={set.id}
                        data-redesign-part="set-row"
                        className="flex min-h-20 items-center gap-2 rounded-sm py-4 transition-colors duration-150 hover:bg-muted/60"
                      >
                        <Link
                          href={`/exercise-sets/${set.id}`}
                          data-testid={`dashboard-set-item-${set.id}`}
                          className="flex min-h-11 items-center gap-3 flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                        >
                          <SetThumbnail exerciseMappings={set.exerciseMappings} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base text-foreground wrap-anywhere">{set.name}</p>
                            <p className="text-sm text-muted-foreground">{set.exerciseMappings?.length || 0} ćw.</p>
                          </div>
                        </Link>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid={`dashboard-quick-assign-${set.id}`}
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={(event) => handleQuickAssign(set, event)}
                              disabled={!organizationId || !therapistId}
                              aria-label={`Personalizuj i przypisz ${set.name}`}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64 wrap-anywhere">
                            Personalizuj i przypisz {set.name}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              ) : (
                <EmptyState
                  icon={FolderKanban}
                  title="Brak zapisanych szablonów"
                  density="inline"
                  className="flex min-h-20 items-center py-4"
                />
              )}
            </div>
            <Button
              data-testid="dashboard-sets-view-all"
              variant="ghost"
              size="sm"
              asChild
              className="mt-2 h-auto min-h-11 max-w-full justify-start gap-1 px-0 text-sm text-muted-foreground whitespace-normal hover:text-foreground"
            >
              <Link href="/exercise-sets">
                <span data-testid="page-button-636" className="wrap-anywhere">
                  Wszystkie zestawy
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </Button>
          </section>
          {canViewBilling && organizationId && <BillingStatusBar organizationId={organizationId} />}
        </div>
      </div>

      {/* Assignment Wizard */}
      {organizationId && therapistId && (
        <AssignmentWizard
          open={isAssignWizardOpen}
          onOpenChange={(open) => {
            setIsAssignWizardOpen(open);
            if (!open) setQuickAssignSet(null);
          }}
          mode={quickAssignSet ? 'from-set' : 'from-patient'}
          organizationId={organizationId}
          therapistId={therapistId}
          preselectedSet={
            quickAssignSet
              ? {
                  id: quickAssignSet.id,
                  name: quickAssignSet.name,
                  description: quickAssignSet.description,
                  frequency: quickAssignSet.frequency ? normalizeFrequencySeed(quickAssignSet.frequency) : undefined,
                  exerciseMappings: quickAssignSet.exerciseMappings?.map((m) => ({
                    id: m.id,
                    exerciseId: m.exerciseId,
                    exercise: m.exercise
                      ? {
                          id: m.exercise.id,
                          name: m.exercise.name,
                          imageUrl: m.exercise.imageUrl,
                          images: m.exercise.images,
                        }
                      : undefined,
                  })),
                }
              : undefined
          }
          onSuccess={() => {
            setIsAssignWizardOpen(false);
            setQuickAssignSet(null);
          }}
        />
      )}

      {/* Create Set Wizard */}
      {organizationId && (
        <CreateSetWizard
          open={isCreateSetWizardOpen}
          onOpenChange={setIsCreateSetWizardOpen}
          organizationId={organizationId}
          onSuccess={() => setIsCreateSetWizardOpen(false)}
        />
      )}

      {/* Patient Dialog */}
      {organizationId && therapistId && (
        <PatientDialog
          open={isPatientDialogOpen}
          onOpenChange={setIsPatientDialogOpen}
          organizationId={organizationId}
          therapistId={therapistId}
        />
      )}
    </div>
  );
}
