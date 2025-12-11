"use client";

import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Dumbbell,
  FolderKanban,
  Users,
  Plus,
  ChevronRight,
  Send,
  UserPlus,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TherapistPatientsResponse,
} from "@/types/apollo";

interface ExerciseItem {
  id: string;
  name: string;
  type?: string;
  imageUrl?: string;
  images?: string[];
}

interface ExerciseSetItem {
  id: string;
  name: string;
  description?: string;
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
  const { data: userData, loading: userLoading } = useQuery(
    GET_USER_BY_CLERK_ID_QUERY,
    {
      variables: { clerkId: user?.id },
      skip: !user?.id,
    }
  );

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

  const exercises =
    (exercisesData as OrganizationExercisesResponse)?.organizationExercises ||
    [];
  const exercisesCount = exercises.length;
  const exerciseSets =
    (setsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];
  const setsCount = exerciseSets.length;
  const patients =
    (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patientsCount = patients.length;

  const isLoading = userLoading || !organizationId;

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Dzień dobry"
      : currentHour < 18
      ? "Cześć"
      : "Dobry wieczór";

  return (
    <div className="space-y-6">
      {/* Welcome section with primary CTA */}
      <div className="relative rounded-2xl border border-border bg-card p-8 lg:p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              {greeting}, {userName}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Zarządzaj pacjentami i przypisuj im zestawy ćwiczeń
            </p>
          </div>
          <Link href="/patients" className="group">
            <Button
              size="lg"
              className="gap-2.5 h-14 px-8 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
            >
              <Send className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Przypisz zestaw pacjentowi
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        {/* Hero Card - Pacjenci */}
        <StatsCard
          title="Twoi pacjenci"
          value={patientsCount}
          icon={Users}
          variant="info"
          size="hero"
          loading={isLoading || patientsLoading}
          className="lg:row-span-2"
          action={{ label: "Zarządzaj pacjentami", href: "/patients" }}
        >
          {/* Recent patients list */}
          {patientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : patients.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Ostatnio dodani
              </p>
              {patients.slice(0, 3).map((assignment: PatientAssignment) => (
                <Link
                  key={assignment.id}
                  href={`/patients/${assignment.patient?.id}`}
                  className="group flex items-center gap-4 p-3 rounded-xl bg-surface/50 hover:bg-surface-light transition-colors"
                >
                  {assignment.patient?.image ? (
                    <img
                      src={assignment.patient.image}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-info to-blue-600 text-white font-semibold text-base">
                      {assignment.patient?.fullname?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">
                      {assignment.patient?.fullname || "Nieznany"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {assignment.contextLabel || "Pacjent"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base text-muted-foreground mb-4">
                Dodaj pierwszego pacjenta
              </p>
              <Link href="/patients">
                <Button variant="outline" className="rounded-xl h-10">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pacjenta
                </Button>
              </Link>
            </div>
          )}
        </StatsCard>

        {/* Zestawy ćwiczeń */}
        <StatsCard
          title="Zestawy ćwiczeń"
          value={setsCount}
          icon={FolderKanban}
          variant="secondary"
          loading={isLoading || setsLoading}
          action={{ label: "Nowy zestaw", href: "/exercise-sets" }}
        />

        {/* Ćwiczenia */}
        <StatsCard
          title="Biblioteka ćwiczeń"
          value={exercisesCount}
          icon={Dumbbell}
          variant="primary"
          loading={isLoading || exercisesLoading}
          action={{ label: "Przeglądaj", href: "/exercises" }}
        />

        {/* Gotowe zestawy do przypisania */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Gotowe zestawy do przypisania
              </CardTitle>
              <Link href="/exercise-sets" className="group">
                <Button variant="ghost" size="sm" className="h-9 text-sm">
                  Wszystkie
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {setsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : exerciseSets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {exerciseSets.slice(0, 4).map((set: ExerciseSetItem) => (
                  <Link
                    key={set.id}
                    href={`/exercise-sets/${set.id}`}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-surface/30 hover:bg-surface-light hover:border-border-light transition-all"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-teal-600">
                      <FolderKanban className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base truncate group-hover:text-secondary transition-colors">
                        {set.name}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {set.description || "Zestaw ćwiczeń"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-base text-muted-foreground mb-4">
                  Stwórz swój pierwszy zestaw ćwiczeń
                </p>
                <Link href="/exercise-sets">
                  <Button className="rounded-xl h-10">
                    <Plus className="mr-2 h-4 w-4" />
                    Nowy zestaw
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent exercises */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Ostatnio dodane ćwiczenia
            </CardTitle>
            <Link href="/exercises" className="group">
              <Button variant="ghost" size="sm" className="h-9 text-sm">
                Biblioteka
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {exercisesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
              ))}
            </div>
          ) : exercises.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {exercises.slice(0, 4).map((exercise: ExerciseItem) => {
                const imageUrl = exercise.imageUrl || exercise.images?.[0];
                return (
                  <Link
                    key={exercise.id}
                    href={`/exercises/${exercise.id}`}
                    className="group relative rounded-xl border border-border overflow-hidden hover:border-border-light transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-4/3 bg-surface-light">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={exercise.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Dumbbell className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    {/* Info overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10">
                      <p className="text-base font-medium text-white truncate">
                        {exercise.name}
                      </p>
                      <p className="text-sm text-white/70">
                        {exercise.type || "Ćwiczenie"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base text-muted-foreground mb-4">
                Zacznij budować bibliotekę ćwiczeń
              </p>
              <Link href="/exercises">
                <Button className="rounded-xl h-10">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj ćwiczenie
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
