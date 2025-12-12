"use client";

import { useQuery } from "@apollo/client/react";
import { Activity, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityChart } from "./ActivityChart";
import { ExerciseStats, StatsSummary } from "./ExerciseStats";

import { GET_EXERCISE_PROGRESS_BY_USER_QUERY } from "@/graphql/queries/exerciseProgress.queries";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";

interface ExerciseProgress {
  id: string;
  exerciseId: string;
  completedAt?: string;
  status: string;
  completedReps?: number;
  completedSets?: number;
  rating?: number;
}

interface ActivityReportProps {
  patientId: string;
  patientName?: string;
}

export function ActivityReport({ patientId, patientName }: ActivityReportProps) {
  // Get exercise progress
  const { data: progressData, loading: progressLoading } = useQuery(
    GET_EXERCISE_PROGRESS_BY_USER_QUERY,
    {
      variables: { userId: patientId },
    }
  );

  // Get patient assignments for context
  const { data: assignmentsData, loading: assignmentsLoading } = useQuery(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    {
      variables: { userId: patientId },
    }
  );

  const isLoading = progressLoading || assignmentsLoading;

  const exerciseProgress: ExerciseProgress[] =
    progressData?.exerciseProgress || [];
  const assignments = assignmentsData?.patientAssignments || [];

  // Calculate stats
  const completedSessions = exerciseProgress.filter(
    (p) => p.status === "completed"
  ).length;

  // Group progress by date for chart
  const progressByDate = exerciseProgress.reduce((acc, progress) => {
    if (progress.completedAt) {
      const date = format(new Date(progress.completedAt), "d MMM", {
        locale: pl,
      });
      acc[date] = (acc[date] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get last 7 days of data
  const last7Days = Object.entries(progressByDate)
    .slice(-7)
    .map(([label, value]) => ({ label, value }));

  // Calculate exercise-level stats
  const exerciseStatsMap = exerciseProgress.reduce((acc, progress) => {
    const exerciseId = progress.exerciseId;
    if (!acc[exerciseId]) {
      acc[exerciseId] = {
        exerciseId,
        exerciseName: `Ćwiczenie ${exerciseId.slice(0, 6)}`,
        completedCount: 0,
        totalSets: 0,
        totalReps: 0,
        totalRating: 0,
        ratingCount: 0,
      };
    }
    if (progress.status === "completed") {
      acc[exerciseId].completedCount++;
      acc[exerciseId].totalSets += progress.completedSets || 0;
      acc[exerciseId].totalReps += progress.completedReps || 0;
      if (progress.rating) {
        acc[exerciseId].totalRating += progress.rating;
        acc[exerciseId].ratingCount++;
      }
    }
    return acc;
  }, {} as Record<string, { exerciseId: string; exerciseName: string; completedCount: number; totalSets: number; totalReps: number; totalRating: number; ratingCount: number }>);

  const exerciseStats = Object.values(exerciseStatsMap)
    .map((stat) => ({
      ...stat,
      averageRating:
        stat.ratingCount > 0 ? stat.totalRating / stat.ratingCount : undefined,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // Calculate streaks (simplified)
  const sortedDates = exerciseProgress
    .filter((p) => p.completedAt && p.status === "completed")
    .map((p) => format(new Date(p.completedAt!), "yyyy-MM-dd"))
    .sort()
    .reverse();

  const uniqueDates = [...new Set(sortedDates)];
  let currentStreak = 0;
  // Simplified streak calculation
  if (uniqueDates.length > 0) {
    currentStreak = Math.min(uniqueDates.length, 7);
  }

  // Average completion
  const avgCompletion =
    assignments.length > 0
      ? Math.round((completedSessions / Math.max(assignments.length * 7, 1)) * 100)
      : 0;

  // Last activity
  const lastActivity =
    sortedDates.length > 0
      ? format(new Date(uniqueDates[0]), "d MMMM yyyy", { locale: pl })
      : undefined;

  if (isLoading) {
    return <LoadingState type="text" count={3} />;
  }

  if (exerciseProgress.length === 0 && assignments.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12">
          <EmptyState
            icon={Activity}
            title="Brak danych aktywności"
            description="Ten pacjent nie ma jeszcze żadnych zarejestrowanych ćwiczeń"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <StatsSummary
        totalCompleted={completedSessions}
        currentStreak={currentStreak}
        averageCompletion={avgCompletion}
        lastActivity={lastActivity}
      />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ćwiczenia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activity over time */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Aktywność w czasie
                </CardTitle>
                <CardDescription>
                  Liczba wykonanych ćwiczeń w ostatnich dniach
                </CardDescription>
              </CardHeader>
              <CardContent>
                {last7Days.length > 0 ? (
                  <ActivityChart
                    data={last7Days}
                    variant="bar"
                    color="primary"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Brak danych z ostatnich dni
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment progress */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  Postęp zestawów
                </CardTitle>
                <CardDescription>
                  Ukończenie przypisanych zestawów ćwiczeń
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length > 0 ? (
                  <ActivityChart
                    data={assignments.slice(0, 5).map((a: { exerciseSet?: { name?: string }; completionCount?: number }) => ({
                      label: a.exerciseSet?.name || "Zestaw",
                      value: a.completionCount || 0,
                      maxValue: 10, // Target sessions
                    }))}
                    variant="progress"
                    color="secondary"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Brak przypisanych zestawów
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="exercises">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Statystyki ćwiczeń</CardTitle>
              <CardDescription>
                Szczegółowe dane o wykonanych ćwiczeniach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExerciseStats stats={exerciseStats} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

