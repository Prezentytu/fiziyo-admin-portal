'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  ArrowRight,
  FolderKanban,
  FolderPlus,
  Users,
  ChevronRight,
  Send,
  UserPlus,
  Sparkles,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SetThumbnail } from '@/components/exercise-sets/SetThumbnail';
import { CreateSetWizard } from '@/components/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import { PatientDialog } from '@/components/patients/PatientDialog';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';
import { GettingStartedCard } from '@/components/onboarding/GettingStartedCard';
import { BillingStatusBar } from '@/components/billing';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';
import { useRealtimeExerciseSets } from '@/hooks/useRealtimeExerciseSets';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { GET_ALL_PATIENT_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type {
  UserByClerkIdResponse,
  OrganizationExerciseSetsResponse,
  TherapistPatientsResponse,
} from '@/types/apollo';

interface ExerciseSetItem {
  id: string;
  name: string;
  description?: string;
  creationTime?: string;
  exerciseMappings?: Array<{
    id: string;
    exercise?: {
      imageUrl?: string;
      images?: string[];
    };
  }>;
}

interface PatientAssignmentData {
  id: string;
  patient?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
    isShadowUser?: boolean;
  };
  contextLabel?: string;
  status?: string;
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

// Activity status indicator component
function ActivityIndicator({ status }: { status: ActivityStatus }) {
  switch (status) {
    case 'active':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-surface">
          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
        </div>
      );
    case 'warning':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-surface">
          <AlertCircle className="h-2.5 w-2.5 text-white" />
        </div>
      );
    case 'inactive':
      return (
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-muted-foreground/60 flex items-center justify-center ring-2 ring-surface">
          <Clock className="h-2.5 w-2.5 text-white" />
        </div>
      );
  }
}

export default function DashboardPage() {
  const { user } = useUser();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { canViewBilling } = useRoleAccess();
  const [isAssignWizardOpen, setIsAssignWizardOpen] = useState(false);
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [quickAssignSet, setQuickAssignSet] = useState<ExerciseSetItem | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId and user name
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const userName = userByClerkId?.fullname || userByClerkId?.personalData?.firstName || user?.firstName || 'Użytkownik';

  // Get exercise sets
  const { data: setsData, loading: setsLoading } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get patients
  const { data: patientsData, loading: patientsLoading } = useQuery(GET_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId,
  });

  // Get all assignments for activity data
  const { data: assignmentsData } = useQuery(GET_ALL_PATIENT_ASSIGNMENTS_QUERY, {
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

  const exerciseSets = (setsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];
  const setsCount = exerciseSets.length;

  // Sort exercise sets by creation time (newest first)
  const sortedExerciseSets = [...exerciseSets].sort((a: ExerciseSetItem, b: ExerciseSetItem) => {
    const dateA = new Date(a.creationTime || 0).getTime();
    const dateB = new Date(b.creationTime || 0).getTime();
    return dateB - dateA;
  });

  const patients = (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patientsCount = patients.length;

  // Get assignments with activity data
  const allAssignments = (assignmentsData as { patientAssignments?: ExerciseAssignment[] })?.patientAssignments || [];
  const therapistAssignmentsCount = allAssignments.filter(a => a.exerciseSetId && a.assignedById === therapistId).length;

  // Create a map of patient activity (most recent lastCompletedAt per patient)
  const patientActivityMap = useMemo(() => {
    const map = new Map<string, { lastCompletedAt?: string; setName?: string }>();

    for (const assignment of allAssignments) {
      if (!assignment.userId) continue;

      const existing = map.get(assignment.userId);
      const currentDate = assignment.lastCompletedAt ? new Date(assignment.lastCompletedAt) : null;
      const existingDate = existing?.lastCompletedAt ? new Date(existing.lastCompletedAt) : null;

      if (!existingDate || (currentDate && currentDate > existingDate)) {
        map.set(assignment.userId, {
          lastCompletedAt: assignment.lastCompletedAt,
          setName: assignment.exerciseSet?.name,
        });
      }
    }

    return map;
  }, [allAssignments]);

  // Enhance patients with activity status and sort by priority
  const patientsWithActivity: PatientWithActivity[] = useMemo(() => {
    const enhanced = patients.map((assignment: PatientAssignmentData) => {
      const patientId = assignment.patient?.id;
      const activity = patientId ? patientActivityMap.get(patientId) : undefined;
      const { status, text, date } = getActivityStatus(activity?.lastCompletedAt);

      return {
        ...assignment,
        activityStatus: status,
        lastActivityText: activity?.setName ? `${text} • ${activity.setName}` : text,
        lastActivityDate: date,
      };
    });

    // Sort: warning first, then inactive, then active (most urgent on top)
    const priorityOrder: Record<ActivityStatus, number> = { warning: 0, inactive: 1, active: 2 };
    return enhanced.sort((a, b) => {
      const priorityDiff = priorityOrder[a.activityStatus] - priorityOrder[b.activityStatus];
      if (priorityDiff !== 0) return priorityDiff;
      // Within same priority, sort by date (most recent first)
      if (a.lastActivityDate && b.lastActivityDate) {
        return b.lastActivityDate.getTime() - a.lastActivityDate.getTime();
      }
      return 0;
    });
  }, [patients, patientActivityMap]);

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Dzień dobry' : currentHour < 18 ? 'Cześć' : 'Dobry wieczór';
  const todayDate = formatPolishDate(new Date());

  // Patients needing attention (warning or inactive)
  const patientsNeedingAttention = patientsWithActivity.filter(p => p.activityStatus !== 'active');
  const displayedPatients = patientsWithActivity.slice(0, 5);

  // Show skeleton while initial data is loading
  const isInitialLoading = !user || userLoading || (!organizationId && !userData);

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
    <div className="space-y-8">
      {/* Header Section - Greeting with date */}
      <div className="flex items-end justify-between">
        <div>
          <h1 data-testid="dashboard-greeting" className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {patientsNeedingAttention.length > 0
              ? `${patientsNeedingAttention.length} pacjentów wymaga uwagi`
              : 'Wszyscy pacjenci są aktywni'}
          </p>
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block">
          {todayDate}
        </p>
      </div>

      {/* Getting Started Card - Onboarding for new users */}
      <GettingStartedCard
        patientsCount={patientsCount}
        exerciseSetsCount={setsCount}
        assignmentsCount={therapistAssignmentsCount}
      />

      {/* Quick Actions - Three Equal Action Cards (4:4:4) */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Action 1 - Przypisz zestaw (zielona - główna akcja) */}
        <button
          onClick={() => setIsAssignWizardOpen(true)}
          disabled={!organizationId || !therapistId}
          data-testid="dashboard-hero-assign-set-btn"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white mb-0.5">
                Przypisz zestaw
              </h3>
              <p className="text-xs text-white/70">
                Dla powracających
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>

        {/* Action 2 - Nowy pacjent (niebieska) */}
        <button
          onClick={() => setIsPatientDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          data-testid="dashboard-add-patient-btn"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-info via-info to-blue-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-info/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white mb-0.5">
                Nowy pacjent
              </h3>
              <p className="text-xs text-white/70">
                Dodaj do bazy
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>

        {/* Action 3 - Utwórz zestaw (ciemna/szara - rzadsza akcja) */}
        <button
          onClick={() => setIsCreateSetWizardOpen(true)}
          disabled={!organizationId}
          data-testid="dashboard-create-set-btn"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface-light p-5 text-left transition-all duration-300 hover:border-primary/40 hover:bg-surface hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mb-0.5">
                Utwórz zestaw
              </h3>
              <p className="text-xs text-muted-foreground">
                Nowy program
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>
      </div>

      {/* Main Content - 8:4 Grid Layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Activity Feed - Left Column (8 cols) */}
        <Card data-testid="dashboard-activity-section" className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
                  <Users className="h-4.5 w-4.5 text-info" />
                </div>
                <span>Wymagają uwagi</span>
                {patientsNeedingAttention.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-amber-500/10 text-amber-500 font-medium">
                    {patientsNeedingAttention.length}
                  </Badge>
                )}
              </CardTitle>
              <Link href="/patients" data-testid="dashboard-patients-view-all" className="group">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Wszyscy ({patientsCount})
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {patientsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-lg" />
                      <Skeleton className="h-3 w-48 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                  </div>
                ))}
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-1 animate-stagger">
                {displayedPatients.map((assignment: PatientWithActivity) => {
                  const isShadow = assignment.patient?.isShadowUser;
                  return (
                    <Link
                      key={assignment.id}
                      href={`/patients/${assignment.patient?.id}`}
                      data-testid={`dashboard-patient-item-${assignment.patient?.id}`}
                      className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        assignment.activityStatus === 'warning'
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : assignment.activityStatus === 'inactive'
                          ? 'hover:bg-surface-light'
                          : 'hover:bg-emerald-500/5'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          className={`h-10 w-10 ring-2 transition-all ${
                            assignment.activityStatus === 'warning'
                              ? 'ring-amber-500/30 group-hover:ring-amber-500/50'
                              : assignment.activityStatus === 'active'
                              ? 'ring-emerald-500/30 group-hover:ring-emerald-500/50'
                              : 'ring-border/20 group-hover:ring-primary/30'
                          }`}
                        >
                          <AvatarImage src={assignment.patient?.image} />
                          <AvatarFallback
                            className={`text-sm font-medium ${
                              isShadow
                                ? 'bg-muted-foreground/60 text-white'
                                : 'bg-gradient-to-br from-info to-blue-600 text-white'
                            }`}
                          >
                            {assignment.patient?.fullname?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isShadow ? (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-surface">
                            <Wrench className="h-2.5 w-2.5 text-white" />
                          </div>
                        ) : (
                          <ActivityIndicator status={assignment.activityStatus} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm truncate transition-colors ${
                            assignment.activityStatus === 'warning'
                              ? 'text-foreground group-hover:text-amber-500'
                              : assignment.activityStatus === 'active'
                              ? 'text-foreground group-hover:text-emerald-600'
                              : 'text-foreground group-hover:text-primary'
                          }`}
                        >
                          {assignment.patient?.fullname || 'Nieznany'}
                        </p>
                        <p className={`text-xs truncate ${
                          assignment.activityStatus === 'warning'
                            ? 'text-amber-600/80'
                            : assignment.activityStatus === 'active'
                            ? 'text-emerald-600/80'
                            : 'text-muted-foreground'
                        }`}>
                          {assignment.lastActivityText}
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-all group-hover:translate-x-0.5 ${
                          assignment.activityStatus === 'warning'
                            ? 'text-amber-500/30 group-hover:text-amber-500'
                            : assignment.activityStatus === 'active'
                            ? 'text-emerald-500/30 group-hover:text-emerald-500'
                            : 'text-muted-foreground/30 group-hover:text-primary'
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-surface-light flex items-center justify-center mb-3">
                  <UserPlus className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Brak pacjentów</p>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Dodaj pierwszego pacjenta
                </p>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsPatientDialogOpen(true)}
                  disabled={!organizationId || !therapistId}
                >
                  Dodaj pacjenta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Sets - Right Column (4 cols) */}
        <Card data-testid="dashboard-sets-section" className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                  <FolderKanban className="h-4.5 w-4.5 text-secondary" />
                </div>
                <span>Szybki wybór</span>
              </CardTitle>
              <Link href="/exercise-sets" data-testid="dashboard-sets-view-all" className="group">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Wszystkie
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {setsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ animationDelay: `${(i + 4) * 50}ms` }}
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden grid grid-cols-2 gap-0.5 shrink-0">
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24 rounded-lg" />
                      <Skeleton className="h-3 w-16 rounded-lg" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  </div>
                ))}
              </div>
            ) : sortedExerciseSets.length > 0 ? (
              <div className="space-y-1 animate-stagger">
                {sortedExerciseSets.slice(0, 5).map((set: ExerciseSetItem) => (
                  <div
                    key={set.id}
                    className="group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-surface-light"
                  >
                    <Link
                      href={`/exercise-sets/${set.id}`}
                      data-testid={`dashboard-set-item-${set.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <SetThumbnail exerciseMappings={set.exerciseMappings} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground group-hover:text-secondary transition-colors truncate">
                          {set.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {set.exerciseMappings?.length || 0} ćw.
                        </p>
                      </div>
                    </Link>
                    {/* Quick Assign Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => handleQuickAssign(set, e)}
                      disabled={!organizationId || !therapistId}
                      data-testid={`dashboard-quick-assign-${set.id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-surface-light flex items-center justify-center mb-3">
                  <Sparkles className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Brak zestawów</p>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Stwórz pierwszy zestaw
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => setIsCreateSetWizardOpen(true)}
                  disabled={!organizationId}
                >
                  Utwórz zestaw
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing Status Bar - Only for Owner/Admin (Full Width) */}
      {canViewBilling && organizationId && (
        <BillingStatusBar organizationId={organizationId} />
      )}

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
          preselectedSet={quickAssignSet ? {
            id: quickAssignSet.id,
            name: quickAssignSet.name,
            description: quickAssignSet.description,
            exerciseMappings: quickAssignSet.exerciseMappings?.map(m => ({
              id: m.id,
              exercise: m.exercise ? {
                imageUrl: m.exercise.imageUrl,
                images: m.exercise.images,
              } : undefined,
            })),
          } : undefined}
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
