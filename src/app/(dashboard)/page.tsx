"use client";

import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { 
  Dumbbell, 
  FolderKanban, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Tag,
  ChevronRight 
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/shared/StatsCard";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import type { 
  UserByClerkIdResponse, 
  OrganizationExercisesResponse, 
  OrganizationExerciseSetsResponse, 
  TherapistPatientsResponse 
} from "@/types/apollo";

interface ExerciseItem {
  id: string;
  name: string;
  type?: string;
  imageUrl?: string;
  images?: string[];
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
}

export default function DashboardPage() {
  const { user } = useUser();

  // Get user data
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];
  const userName =
    userByClerkId?.fullname ||
    userByClerkId?.personalData?.firstName ||
    user?.firstName ||
    "Użytkownik";

  // Get exercises count
  const { data: exercisesData, loading: exercisesLoading } = useQuery(
    GET_ORGANIZATION_EXERCISES_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Get exercise sets count
  const { data: setsData, loading: setsLoading } = useQuery(
    GET_ORGANIZATION_EXERCISE_SETS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Get patients count
  const { data: patientsData, loading: patientsLoading } = useQuery(
    GET_THERAPIST_PATIENTS_QUERY,
    {
      variables: { therapistId, organizationId },
      skip: !therapistId || !organizationId,
    }
  );

  const exercises = (exercisesData as OrganizationExercisesResponse)?.organizationExercises || [];
  const exercisesCount = exercises.length;
  const setsCount = (setsData as OrganizationExerciseSetsResponse)?.exerciseSets?.length || 0;
  const patients = (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patientsCount = patients.length;

  const isLoading = userLoading || !organizationId;

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Dzień dobry" : currentHour < 18 ? "Cześć" : "Dobry wieczór";

  return (
    <div className="space-y-8">
      {/* Welcome section with gradient */}
      <div className="relative rounded-2xl border border-border bg-card p-8 overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Co chcesz dzisiaj zrobić?
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ćwiczenia"
          value={exercisesCount}
          icon={Dumbbell}
          variant="primary"
          loading={isLoading || exercisesLoading}
        />
        <StatsCard
          title="Zestawy"
          value={setsCount}
          icon={FolderKanban}
          variant="secondary"
          loading={isLoading || setsLoading}
        />
        <StatsCard
          title="Pacjenci"
          value={patientsCount}
          icon={Users}
          variant="info"
          loading={isLoading || patientsLoading}
        />
        <StatsCard
          title="Aktywność"
          value="—"
          icon={TrendingUp}
          variant="warning"
          description="Wkrótce dostępne"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action cards */}
        <Card className="card-interactive">
          <CardHeader>
            <CardTitle className="text-lg">Szybkie akcje</CardTitle>
            <CardDescription>Często używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/exercises" className="block">
                <div className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary hover:bg-surface-light">
                  <div className="stats-icon">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">Ćwiczenia</span>
                </div>
              </Link>
              <Link href="/exercise-sets" className="block">
                <div className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-secondary hover:bg-surface-light">
                  <div className="stats-icon-secondary">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">Zestawy</span>
                </div>
              </Link>
              <Link href="/patients" className="block">
                <div className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-info hover:bg-surface-light">
                  <div className="stats-icon-info">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">Pacjenci</span>
                </div>
              </Link>
              <Link href="/exercises/tags" className="block">
                <div className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-warning hover:bg-surface-light">
                  <div className="stats-icon-warning">
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">Tagi</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent exercises with thumbnails */}
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ostatnie ćwiczenia</CardTitle>
              <CardDescription>Ostatnio dodane do biblioteki</CardDescription>
            </div>
            <Link href="/exercises">
              <Button variant="ghost" size="sm" className="gap-1">
                Wszystkie
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {exercisesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : exercises.length ? (
              <div className="space-y-2">
                {exercises.slice(0, 4).map((exercise: ExerciseItem) => {
                  const imageUrl = exercise.imageUrl || exercise.images?.[0];
                  return (
                    <Link
                      key={exercise.id}
                      href={`/exercises/${exercise.id}`}
                      className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-all hover:border-border-light hover:bg-surface-light"
                    >
                      {/* Thumbnail */}
                      <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={exercise.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-surface-light flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{exercise.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.type || "Ćwiczenie"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Brak ćwiczeń w bibliotece
                </p>
                <Link href="/exercises">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj ćwiczenie
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent patients */}
      <Card className="card-interactive">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Twoi pacjenci</CardTitle>
            <CardDescription>Lista przypisanych pacjentów</CardDescription>
          </div>
          <Link href="/patients">
            <Button variant="ghost" size="sm" className="gap-1">
              Zobacz wszystkich
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {patientsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : patients.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {patients.slice(0, 6).map((assignment: PatientAssignment) => (
                <Link
                  key={assignment.id}
                  href={`/patients/${assignment.patient?.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-border-light hover:bg-surface-light"
                >
                  {/* Avatar */}
                  {assignment.patient?.image ? (
                    <img
                      src={assignment.patient.image}
                      alt={assignment.patient?.fullname || ""}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-lg">
                      {assignment.patient?.fullname?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {assignment.patient?.fullname || "Nieznany pacjent"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {assignment.contextLabel || assignment.patient?.email || "Brak opisu"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                Nie masz jeszcze przypisanych pacjentów
              </p>
              <Link href="/patients">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pacjenta
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
