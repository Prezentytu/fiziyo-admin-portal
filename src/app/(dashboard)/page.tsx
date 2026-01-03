'use client';

import { useState } from 'react';
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
  Sparkles,
  Rocket,
  ArrowRight,
  Zap,
  Wrench,
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

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
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

interface PatientAssignment {
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

// Format date in Polish
function formatPolishDate(date: Date): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [isAssignWizardOpen, setIsAssignWizardOpen] = useState(false);
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);

  // Get user data
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];
  const userName = userByClerkId?.fullname || userByClerkId?.personalData?.firstName || user?.firstName || 'Użytkownik';

  // Get exercise sets
  const { data: setsData, loading: setsLoading } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get patients count
  const { data: patientsData, loading: patientsLoading } = useQuery(GET_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId,
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

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Dzień dobry' : currentHour < 18 ? 'Cześć' : 'Dobry wieczór';
  const todayDate = formatPolishDate(new Date());

  // Calculate active patients
  const activePatients = patients.filter((p: PatientAssignment) => p.status !== 'inactive');
  const displayedPatients = activePatients.slice(0, 4);

  // Subscription limit info
  const limit = 5;
  const isAtLimit = patientsCount >= limit;

  // Show skeleton while initial data is loading
  const isInitialLoading = !user || userLoading || (!organizationId && !userData);

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header Section - Greeting with date */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Co chcesz dziś zrobić?
          </p>
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block">
          {todayDate}
        </p>
      </div>

      {/* Quick Actions - Hero + Companions Layout */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Przypisz zestaw (larger) */}
        <button
          onClick={() => setIsAssignWizardOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 sm:p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 lg:col-span-6"
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Przypisz zestaw
              </h3>
              <p className="text-sm text-white/80">
                Wyślij program ćwiczeń do pacjenta
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </button>

        {/* Secondary Action - Utwórz zestaw */}
        <button
          onClick={() => setIsCreateSetWizardOpen(true)}
          disabled={!organizationId}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 text-left transition-all duration-300 hover:border-primary/40 hover:bg-surface-light hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed lg:col-span-3 flex items-center"
        >
          <div className="relative flex items-center gap-3 w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Utwórz zestaw
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nowy program
              </p>
            </div>
          </div>
        </button>

        {/* Tertiary Action - Dodaj pacjenta */}
        <button
          onClick={() => setIsPatientDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 text-left transition-all duration-300 hover:border-info/40 hover:bg-surface-light hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed lg:col-span-3 flex items-center"
        >
          <div className="relative flex items-center gap-3 w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 shrink-0 group-hover:bg-info/20 group-hover:scale-110 transition-all duration-300">
              <UserPlus className="h-5 w-5 text-info" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-info transition-colors">
                Dodaj pacjenta
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nowy pacjent
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Main Content - Bento Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Patients Section */}
        <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
                  <Users className="h-4.5 w-4.5 text-info" />
                </div>
                <span>Twoi pacjenci</span>
                <Badge variant="secondary" className="ml-1 bg-surface-light text-muted-foreground font-medium">
                  {patientsCount}
                </Badge>
              </CardTitle>
              <Link href="/patients" className="group">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Wszyscy
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {patientsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-lg" />
                      <Skeleton className="h-3 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                  </div>
                ))}
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-2 animate-stagger">
                {displayedPatients.map((assignment: PatientAssignment) => {
                  const isShadow = assignment.patient?.isShadowUser;
                  return (
                    <Link
                      key={assignment.id}
                      href={`/patients/${assignment.patient?.id}`}
                      className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        isShadow
                          ? 'hover:bg-surface opacity-70 hover:opacity-100'
                          : 'hover:bg-surface-light'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          className={`h-10 w-10 ring-2 transition-all ${
                            isShadow
                              ? 'ring-muted-foreground/20 group-hover:ring-muted-foreground/40'
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
                        {isShadow && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-surface">
                            <Wrench className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm truncate transition-colors ${
                            isShadow
                              ? 'text-muted-foreground group-hover:text-foreground'
                              : 'text-foreground group-hover:text-primary'
                          }`}
                        >
                          {assignment.patient?.fullname || 'Nieznany'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.contextLabel || assignment.patient?.email || ''}
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-all group-hover:translate-x-0.5 ${
                          isShadow
                            ? 'text-muted-foreground/20 group-hover:text-muted-foreground'
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

        {/* Exercise Sets Section */}
        <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                  <FolderKanban className="h-4.5 w-4.5 text-secondary" />
                </div>
                <span>Zestawy ćwiczeń</span>
                <Badge variant="secondary" className="ml-1 bg-surface-light text-muted-foreground font-medium">
                  {setsCount}
                </Badge>
              </CardTitle>
              <Link href="/exercise-sets" className="group">
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
                    {/* Set Thumbnail Skeleton - 2x2 grid */}
                    <div className="h-10 w-10 rounded-lg overflow-hidden grid grid-cols-2 gap-0.5 shrink-0">
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                      <Skeleton className="rounded-none" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-36 rounded-lg" />
                      <Skeleton className="h-3 w-20 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                  </div>
                ))}
              </div>
            ) : sortedExerciseSets.length > 0 ? (
              <div className="space-y-2 animate-stagger">
                {sortedExerciseSets.slice(0, 4).map((set: ExerciseSetItem) => (
                  <Link
                    key={set.id}
                    href={`/exercise-sets/${set.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-surface-light"
                  >
                    <SetThumbnail exerciseMappings={set.exerciseMappings} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground group-hover:text-secondary transition-colors truncate">
                        {set.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {set.exerciseMappings?.length || 0} ćwiczeń
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-surface-light flex items-center justify-center mb-3">
                  <Sparkles className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Brak zestawów</p>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Stwórz pierwszy zestaw ćwiczeń
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

      {/* Subscription Banner - Compact, at bottom */}
      {isAtLimit && (
        <div className="relative rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-red-500/5 to-orange-500/10 p-4 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Osiągnąłeś limit pacjentów
                  <Zap className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                </p>
                <p className="text-xs text-muted-foreground">
                  Ulepsz plan i rozwijaj praktykę bez ograniczeń
                </p>
              </div>
            </div>
            <Link href="/subscription">
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 shadow-lg shadow-orange-500/20 text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ulepsz plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Assignment Wizard */}
      {organizationId && therapistId && (
        <AssignmentWizard
          open={isAssignWizardOpen}
          onOpenChange={setIsAssignWizardOpen}
          mode="from-patient"
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => setIsAssignWizardOpen(false)}
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
