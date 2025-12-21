'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Dumbbell,
  FolderKanban,
  Users,
  Plus,
  ChevronRight,
  Send,
  UserPlus,
  Sparkles,
  Rocket,
  ArrowRight,
  Zap,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type {
  UserByClerkIdResponse,
  OrganizationExercisesResponse,
  OrganizationExerciseSetsResponse,
  TherapistPatientsResponse,
} from '@/types/apollo';

interface ExerciseSetItem {
  id: string;
  name: string;
  description?: string;
  exerciseMappings?: Array<{ id: string }>;
}

interface PatientAssignment {
  id: string;
  patient?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  };
  contextLabel?: string;
  status?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [showAllPatients, setShowAllPatients] = useState(false);

  // Get user data
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];
  const userName = userByClerkId?.fullname || userByClerkId?.personalData?.firstName || user?.firstName || 'Użytkownik';

  // Get exercises count
  const { data: exercisesData, loading: exercisesLoading } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get exercise sets count
  const { data: setsData, loading: setsLoading } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get patients count
  const { data: patientsData, loading: patientsLoading } = useQuery(GET_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId,
  });

  const exercises = (exercisesData as OrganizationExercisesResponse)?.organizationExercises || [];
  const exercisesCount = exercises.length;
  const exerciseSets = (setsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];
  const setsCount = exerciseSets.length;
  const patients = (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patientsCount = patients.length;

  const isLoading = userLoading || !organizationId;

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Dzień dobry' : currentHour < 18 ? 'Cześć' : 'Dobry wieczór';

  // Calculate active patients (for demo, showing all as active)
  const activePatients = patients.filter((p: PatientAssignment) => p.status !== 'inactive');
  const displayedPatients = showAllPatients ? activePatients : activePatients.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-surface via-surface to-surface-light p-8 lg:p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                {greeting}, {userName}!
              </h1>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link href="/patients">
                <Button
                  size="lg"
                  className="gap-2 h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
                >
                  <Send className="h-5 w-5" />
                  Przypisz zestaw
                </Button>
              </Link>
              <Link href="/patients">
                <Button size="lg" variant="outline" className="gap-2 h-12 px-6">
                  <UserPlus className="h-5 w-5" />
                  Dodaj pacjenta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Banner - shown when approaching limits */}
      {patientsCount >= 3 && (
        <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Rozwijaj swoją praktykę
                  <Zap className="h-4 w-4 text-primary fill-primary" />
                </h3>
                <p className="text-sm text-muted-foreground">
                  Wykorzystujesz {Math.round((patientsCount / 5) * 100)}% limitu. Przejdź na Professional dla
                  nieograniczonej liczby pacjentów.
                </p>
              </div>
            </div>
            <Link href="/subscription">
              <Button className="gap-2 whitespace-nowrap shadow-lg shadow-primary/30">
                <Sparkles className="h-4 w-4" />
                Ulepsz plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Patients */}
        <div className="lg:col-span-2 space-y-6">
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
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {displayedPatients.map((assignment: PatientAssignment) => (
                      <Link
                        key={assignment.id}
                        href={`/patients/${assignment.patient?.id}`}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-surface hover:bg-surface-light hover:border-primary/20 transition-all"
                      >
                        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-border/30 group-hover:ring-primary/20 transition-all">
                          <AvatarImage src={assignment.patient?.image} />
                          <AvatarFallback className="bg-gradient-to-br from-info to-blue-600 text-white font-semibold">
                            {assignment.patient?.fullname?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                            {assignment.patient?.fullname || 'Nieznany'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {assignment.contextLabel || assignment.patient?.email || 'Pacjent'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                      </Link>
                    ))}
                  </div>
                  {activePatients.length > 4 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-muted-foreground"
                      onClick={() => setShowAllPatients(!showAllPatients)}
                    >
                      {showAllPatients ? 'Pokaż mniej' : `Pokaż wszystkich (${activePatients.length})`}
                    </Button>
                  )}
                </>
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
              ) : exerciseSets.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {exerciseSets.slice(0, 4).map((set: ExerciseSetItem) => (
                    <Link
                      key={set.id}
                      href={`/exercise-sets/${set.id}`}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-surface hover:bg-surface-light hover:border-secondary/20 transition-all"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/80 to-teal-600/80 shadow-sm">
                        <FolderKanban className="h-5 w-5 text-white" />
                      </div>
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

        {/* Right Column - Stats & Quick Info */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4">
            <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pacjenci</p>
                    <div className="text-3xl font-bold text-foreground mt-1">
                      {isLoading || patientsLoading ? <Skeleton className="h-9 w-16" /> : patientsCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{activePatients.length} aktywnych</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Zestawy</p>
                    <div className="text-3xl font-bold text-foreground mt-1">
                      {isLoading || setsLoading ? <Skeleton className="h-9 w-16" /> : setsCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">gotowych programów</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <FolderKanban className="h-6 w-6 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ćwiczenia</p>
                    <div className="text-3xl font-bold text-foreground mt-1">
                      {isLoading || exercisesLoading ? <Skeleton className="h-9 w-16" /> : exercisesCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">w bibliotece</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link href="/exercises" className="block">
                <Button variant="ghost" className="w-full justify-start h-11 hover:bg-surface-light">
                  <Dumbbell className="mr-3 h-4 w-4 text-primary" />
                  Przeglądaj ćwiczenia
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/exercise-sets" className="block">
                <Button variant="ghost" className="w-full justify-start h-11 hover:bg-surface-light">
                  <Plus className="mr-3 h-4 w-4 text-secondary" />
                  Utwórz zestaw
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/appointments" className="block">
                <Button variant="ghost" className="w-full justify-start h-11 hover:bg-surface-light">
                  <Calendar className="mr-3 h-4 w-4 text-info" />
                  Harmonogram wizyt
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/organization" className="block">
                <Button variant="ghost" className="w-full justify-start h-11 hover:bg-surface-light">
                  <Activity className="mr-3 h-4 w-4 text-muted-foreground" />
                  Zarządzaj organizacją
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
}
