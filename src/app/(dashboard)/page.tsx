"use client";

import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Dumbbell, FolderKanban, Users, TrendingUp, Plus, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import type { UserByClerkIdResponse, OrganizationExercisesResponse, OrganizationExerciseSetsResponse, TherapistPatientsResponse } from "@/types/apollo";

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
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

  const exercisesCount = (exercisesData as OrganizationExercisesResponse)?.organizationExercises?.length || 0;
  const setsCount = (setsData as OrganizationExerciseSetsResponse)?.exerciseSets?.length || 0;
  const patientsCount = (patientsData as TherapistPatientsResponse)?.therapistPatients?.length || 0;

  const isLoading = userLoading || !organizationId;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Witaj, {userName}! Co chcesz dzisiaj zrobić?
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ćwiczenia"
          value={exercisesCount}
          icon={Dumbbell}
          loading={isLoading || exercisesLoading}
        />
        <StatCard
          title="Zestawy"
          value={setsCount}
          icon={FolderKanban}
          loading={isLoading || setsLoading}
        />
        <StatCard
          title="Pacjenci"
          value={patientsCount}
          icon={Users}
          loading={isLoading || patientsLoading}
        />
        <StatCard
          title="Aktywność"
          value="—"
          icon={TrendingUp}
          loading={false}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
            <CardDescription>Często używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/exercises">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Dumbbell className="h-5 w-5" />
                  <span>Ćwiczenia</span>
                </Button>
              </Link>
              <Link href="/exercise-sets">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <FolderKanban className="h-5 w-5" />
                  <span>Zestawy</span>
                </Button>
              </Link>
              <Link href="/patients">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span>Pacjenci</span>
                </Button>
              </Link>
              <Link href="/exercises/tags">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Tagi</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ostatnie elementy</CardTitle>
            <CardDescription>Ostatnio dodane ćwiczenia</CardDescription>
          </CardHeader>
          <CardContent>
            {exercisesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (exercisesData as OrganizationExercisesResponse)?.organizationExercises?.length ? (
              <div className="space-y-2">
                {(exercisesData as OrganizationExercisesResponse).organizationExercises?.slice(0, 5).map((exercise: {
                  id: string;
                  name: string;
                  type?: string;
                }) => (
                  <Link
                    key={exercise.id}
                    href={`/exercises/${exercise.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-surface-light"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-light">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.type || "Ćwiczenie"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak ćwiczeń. Dodaj swoje pierwsze ćwiczenie!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent patients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Twoi pacjenci</CardTitle>
            <CardDescription>Lista przypisanych pacjentów</CardDescription>
          </div>
          <Link href="/patients">
            <Button variant="outline" size="sm">
              Zobacz wszystkich
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {patientsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (patientsData as TherapistPatientsResponse)?.therapistPatients?.length ? (
            <div className="space-y-2">
              {(patientsData as TherapistPatientsResponse).therapistPatients?.slice(0, 5).map((assignment: {
                id: string;
                patient?: {
                  id: string;
                  fullname?: string;
                  email?: string;
                };
                contextLabel?: string;
              }) => (
                <Link
                  key={assignment.id}
                  href={`/patients/${assignment.patient?.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-light"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                    {assignment.patient?.fullname?.[0] || "?"}
                  </div>
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
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
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
