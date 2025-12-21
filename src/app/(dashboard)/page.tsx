'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  FolderKanban,
  FolderPlus,
  Users,
  Plus,
  ChevronRight,
  Send,
  UserPlus,
  Sparkles,
  Rocket,
  ArrowRight,
  Zap,
  TrendingUp,
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

export default function DashboardPage() {
  const { user } = useUser();
  const [isAssignWizardOpen, setIsAssignWizardOpen] = useState(false);
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
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

  // Calculate active patients (for demo, showing all as active)
  const activePatients = patients.filter((p: PatientAssignment) => p.status !== 'inactive');
  const displayedPatients = activePatients.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {greeting}, {userName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Co chcesz dziś zrobić?
            </p>
          </div>
        </div>

        {/* Quick Actions - Compact Card Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Primary Action - Assign Set */}
          <button
            onClick={() => setIsAssignWizardOpen(true)}
            disabled={!organizationId || !therapistId}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dark p-4 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 shrink-0">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  Przypisz zestaw
                </h3>
                <p className="text-xs text-white/70 truncate">
                  Wyślij ćwiczenia do pacjenta
                </p>
              </div>
            </div>
          </button>

          {/* Secondary Action - Create Set */}
          <button
            onClick={() => setIsCreateSetWizardOpen(true)}
            disabled={!organizationId}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 text-left transition-all duration-200 hover:border-primary/50 hover:bg-surface-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Utwórz zestaw
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Stwórz nowy program ćwiczeń
                </p>
              </div>
            </div>
          </button>

          {/* Tertiary Action - Add Patient */}
          <Link
            href="/patients"
            className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 text-left transition-all duration-200 hover:border-info/50 hover:bg-surface-light cursor-pointer"
          >
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 shrink-0 group-hover:bg-info/20 transition-colors">
                <UserPlus className="h-5 w-5 text-info" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-info transition-colors">
                  Dodaj pacjenta
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Zarejestruj nowego pacjenta
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Subscription Progress Banner - always visible, changes style based on usage */}
      {(() => {
        const limit = 5;
        const usage = Math.min(patientsCount, limit);
        const percentage = Math.round((usage / limit) * 100);
        const isAtLimit = patientsCount >= limit;
        const isNearLimit = patientsCount >= 3 && patientsCount < limit;

        return (
          <div
            className={`relative rounded-2xl border p-5 overflow-hidden transition-all ${
              isAtLimit
                ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-red-500/10 to-amber-500/15'
                : isNearLimit
                ? 'border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5'
                : 'border-border/60 bg-surface'
            }`}
          >
            {isAtLimit && (
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}
            {isNearLimit && !isAtLimit && (
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isAtLimit
                      ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {isAtLimit ? (
                      <>
                        Czas na rozwój!
                        <Zap className="h-4 w-4 text-orange-500 fill-orange-500" />
                      </>
                    ) : (
                      'Rozwijaj swoją praktykę'
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isAtLimit
                      ? 'Osiągnąłeś limit pacjentów. Ulepsz plan i rozwijaj praktykę bez ograniczeń!'
                      : `Wykorzystujesz ${percentage}% limitu. Przejdź na Professional dla nieograniczonej liczby pacjentów.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/subscription">
                  <Button
                    className={`gap-2 whitespace-nowrap ${
                      isAtLimit
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30 border-0'
                        : ''
                    }`}
                    variant={isAtLimit ? 'default' : 'outline'}
                  >
                    <Sparkles className="h-4 w-4" />
                    Ulepsz plan
                    {isAtLimit && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patients Section */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <Users className="h-4 w-4 text-info" />
                </div>
                Twoi pacjenci
                <Badge variant="secondary" className="ml-2">
                  {patientsCount}
                </Badge>
              </CardTitle>
              <Link href="/patients" className="group">
                <Button variant="ghost" size="sm" className="h-8 text-sm gap-1">
                  Wszyscy
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {patientsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : patients.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {displayedPatients.map((assignment: PatientAssignment) => {
                  const isShadow = assignment.patient?.isShadowUser;
                  return (
                    <Link
                      key={assignment.id}
                      href={`/patients/${assignment.patient?.id}`}
                      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isShadow
                          ? 'border-border/30 bg-surface/80 hover:bg-surface hover:border-muted-foreground/20'
                          : 'border-border/50 bg-surface hover:bg-surface-light hover:border-primary/20'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          className={`h-11 w-11 ring-2 transition-all ${
                            isShadow
                              ? 'ring-muted-foreground/20 group-hover:ring-muted-foreground/30'
                              : 'ring-border/30 group-hover:ring-primary/20'
                          }`}
                        >
                          <AvatarImage src={assignment.patient?.image} />
                          <AvatarFallback
                            className={`font-semibold ${
                              isShadow
                                ? 'bg-muted-foreground/60 text-white'
                                : 'bg-gradient-to-br from-info to-blue-600 text-white'
                            }`}
                          >
                            {assignment.patient?.fullname?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isShadow && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-surface">
                            <Wrench className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate transition-colors ${
                            isShadow
                              ? 'text-muted-foreground group-hover:text-foreground'
                              : 'text-foreground group-hover:text-primary'
                          }`}
                        >
                          {assignment.patient?.fullname || 'Nieznany'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.contextLabel || assignment.patient?.email || 'Pacjent'}
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-all group-hover:translate-x-0.5 ${
                          isShadow
                            ? 'text-muted-foreground/30 group-hover:text-muted-foreground'
                            : 'text-muted-foreground/50 group-hover:text-primary'
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                  <UserPlus className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-2">Dodaj pierwszego pacjenta</p>
                <p className="text-sm text-muted-foreground/70 mb-4 max-w-xs">
                  Zacznij budować swoją bazę pacjentów i przypisuj im zestawy ćwiczeń
                </p>
                <Link href="/patients">
                  <Button className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pacjenta
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise Sets Section */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                  <FolderKanban className="h-4 w-4 text-secondary" />
                </div>
                Zestawy ćwiczeń
                <Badge variant="secondary" className="ml-2">
                  {setsCount}
                </Badge>
              </CardTitle>
              <Link href="/exercise-sets" className="group">
                <Button variant="ghost" size="sm" className="h-8 text-sm gap-1">
                  Wszystkie
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {setsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : sortedExerciseSets.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedExerciseSets.slice(0, 4).map((set: ExerciseSetItem) => (
                  <Link
                    key={set.id}
                    href={`/exercise-sets/${set.id}`}
                    className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-surface hover:bg-surface-light hover:border-secondary/20 transition-all"
                  >
                    <SetThumbnail exerciseMappings={set.exerciseMappings} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground group-hover:text-secondary transition-colors">
                        {set.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {set.exerciseMappings?.length || 0} ćw.
                        </Badge>
                      </div>
                      {set.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{set.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-2">Stwórz pierwszy zestaw</p>
                <p className="text-sm text-muted-foreground/70 mb-4 max-w-xs">
                  Zestawy ćwiczeń to gotowe programy, które przypisujesz pacjentom
                </p>
                <Link href="/exercise-sets">
                  <Button variant="secondary" className="shadow-lg shadow-secondary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Nowy zestaw
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Porada dnia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Personalizuj zestawy dla każdego pacjenta - dostosuj liczbę serii i powtórzeń do ich możliwości.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Wizard - from dashboard, user picks set first, then patients */}
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
    </div>
  );
}
