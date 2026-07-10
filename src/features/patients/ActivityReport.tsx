'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Activity, BarChart3, CheckCircle2, Flame, FolderKanban } from 'lucide-react';

import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

import { TherapyStatusCard } from './TherapyStatusCard';
import { FeelingsHeatmap } from './FeelingsHeatmap';
import { EventJournal } from './EventJournal';
import { NextStepCard } from './NextStepCard';
import { ExerciseExecutionLog } from './ExerciseExecutionLog';
import { SetProgressCard } from './SetProgressCard';

import {
  GET_ALL_EXERCISE_SETS_PROGRESS_QUERY,
  GET_EXERCISE_PROGRESS_BY_USER_QUERY,
} from '@/graphql/queries/exerciseProgress.queries';
import { GET_PATIENT_ACTIVITY_REPORT_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import {
  calculateTherapyStatus,
  generateHeatmapData,
  formatRelativeDate,
  type ExerciseProgressData,
  type PatientAssignmentData,
} from '@/lib/therapyStatus';

interface ActivityReportProps {
  readonly patientId: string;
  readonly patientName?: string;
  readonly heatmapDays?: number;
  readonly journalDays?: number;
  readonly onSendMessage?: () => void;
  readonly onSendPraise?: () => void;
  readonly onEditPlan?: () => void;
  readonly onCall?: () => void;
}

interface ExerciseProgressQueryItem {
  id: string;
  assignmentId?: string | null;
  exerciseId?: string | null;
  exerciseSetId?: string | null;
  completedAt?: string | null;
  status: string;
  completedReps?: number | null;
  completedSets?: number | null;
  completedTime?: number | null;
  painLevel?: number | null;
  difficultyLevel?: number | null;
  notes?: string | null;
  patientNotes?: string | null;
  rating?: number | null;
  realDuration?: number | null;
  exercise?: {
    id: string;
    name: string;
    type?: string | null;
  } | null;
}

interface PatientAssignmentsQueryItem {
  id: string;
  completionCount?: number | null;
  currentCycleStartedAt?: string | null;
  exerciseSet?: {
    name?: string | null;
  } | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  frequency?: PatientAssignmentData['frequency'];
}

interface ExerciseSetProgressQueryItem {
  assignmentId: string;
  exerciseSetId?: string | null;
  exerciseSetName?: string | null;
  totalExercises: number;
  completedExercises: number;
  lastCompletedAt?: string | null;
}

interface ExerciseProgressQueryResponse {
  exerciseProgress?: ExerciseProgressQueryItem[];
}

interface PatientAssignmentsQueryResponse {
  patientAssignments?: PatientAssignmentsQueryItem[];
}

interface ExerciseSetProgressQueryResponse {
  allExerciseSetsProgress?: ExerciseSetProgressQueryItem[];
}

interface PatientActivityReportQueryResponse {
  patientActivityReport?: {
    summary?: {
      completedExercises: number;
      totalExercises: number;
      overallCompletionPercentage: number;
      totalCompletedSessions: number;
      totalExerciseSets: number;
    } | null;
  } | null;
}

export function ActivityReport({
  patientId,
  patientName: _patientName,
  heatmapDays = 28,
  journalDays = 5,
  onSendMessage,
  onSendPraise,
  onEditPlan,
  onCall,
}: ActivityReportProps) {
  const reportPeriod = useMemo(() => {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 30);
    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }, []);

  // Get exercise progress
  const { data: progressData, loading: progressLoading } = useQuery(GET_EXERCISE_PROGRESS_BY_USER_QUERY, {
    variables: { userId: patientId },
  });

  // Get patient assignments for context
  const { data: assignmentsData, loading: assignmentsLoading } = useQuery(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: patientId },
  });

  const { data: setProgressData, loading: setProgressLoading } = useQuery(GET_ALL_EXERCISE_SETS_PROGRESS_QUERY, {
    variables: { userId: patientId },
  });

  const { data: activityReportData, loading: activityReportLoading } = useQuery(GET_PATIENT_ACTIVITY_REPORT_QUERY, {
    variables: { patientId, ...reportPeriod },
  });

  const isLoading = progressLoading || assignmentsLoading || setProgressLoading || activityReportLoading;

  // Map to ExerciseProgressData type with all needed fields
  const exerciseProgress: ExerciseProgressData[] = (
    (progressData as ExerciseProgressQueryResponse | undefined)?.exerciseProgress || []
  ).map((progress) => ({
    id: progress.id,
    assignmentId: progress.assignmentId,
    exerciseId: progress.exerciseId,
    exerciseSetId: progress.exerciseSetId,
    completedAt: progress.completedAt,
    status: progress.status,
    completedReps: progress.completedReps,
    completedSets: progress.completedSets,
    completedTime: progress.completedTime,
    painLevel: progress.painLevel,
    difficultyLevel: progress.difficultyLevel,
    notes: progress.notes,
    patientNotes: progress.patientNotes,
    rating: progress.rating,
    realDuration: progress.realDuration,
    exercise: progress.exercise,
  }));

  const rawAssignments = (assignmentsData as PatientAssignmentsQueryResponse | undefined)?.patientAssignments || [];
  const setProgress =
    (setProgressData as ExerciseSetProgressQueryResponse | undefined)?.allExerciseSetsProgress || [];
  const activityReportSummary = (activityReportData as PatientActivityReportQueryResponse | undefined)
    ?.patientActivityReport?.summary;

  // Map to PatientAssignmentData for therapy status calculation
  const assignmentsForStatus: PatientAssignmentData[] = rawAssignments.map((assignment) => ({
    id: assignment.id,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    status: assignment.status,
    frequency: assignment.frequency,
  }));

  // Calculate therapy status (with assignments for proper schedule awareness)
  const therapyStatus = calculateTherapyStatus(exerciseProgress, assignmentsForStatus);

  // Generate heatmap data (with assignments for proper schedule awareness)
  const heatmapData = generateHeatmapData(exerciseProgress, assignmentsForStatus, heatmapDays);

  // Get last activity label
  const lastActivity = exerciseProgress
    .filter((p) => p.completedAt && p.status === 'completed')
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

  const lastActivityLabel = lastActivity?.completedAt ? formatRelativeDate(lastActivity.completedAt) : undefined;

  if (isLoading) {
    return <LoadingState type="text" count={3} />;
  }

  if (exerciseProgress.length === 0 && rawAssignments.length === 0) {
    return (
      <div className="rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 py-12">
        <EmptyState
          icon={Activity}
          title="Brak danych aktywności"
          description="Ten pacjent nie ma jeszcze żadnych zarejestrowanych ćwiczeń"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* KPI Scorecard - anchor stat (realizacja) + supporting metrics, shown first (Reciprocity) */}
      {activityReportSummary && (
        <div
          className="rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 p-5 md:p-6"
          data-testid="patient-activity-kpi-scorecard"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Raport okresowy · ostatnie 30 dni
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 md:gap-8">
            <div className="flex items-center gap-4 sm:border-r sm:border-border/60 sm:pr-6 md:pr-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Realizacja planu</p>
                <p className="text-3xl font-bold leading-tight text-foreground">
                  {activityReportSummary.overallCompletionPercentage}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activityReportSummary.overallCompletionPercentage > 0
                    ? 'w tym okresie'
                    : 'Brak aktywności w tym okresie'}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-3 gap-4 sm:gap-6">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight text-foreground">
                    {activityReportSummary.completedExercises}/{activityReportSummary.totalExercises}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">Wykonane ćwiczenia</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Flame className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight text-foreground">
                    {activityReportSummary.totalCompletedSessions}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">Dni z treningiem</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <FolderKanban className="h-4 w-4 shrink-0 text-info" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight text-foreground">
                    {activityReportSummary.totalExerciseSets}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">Aktywne zestawy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status + Next Step */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <TherapyStatusCard
          statusResult={therapyStatus}
          lastActivityLabel={lastActivityLabel}
          className="md:col-span-2"
        />
        <NextStepCard
          statusResult={therapyStatus}
          onSendMessage={onSendMessage}
          onSendPraise={onSendPraise}
          onEditPlan={onEditPlan}
          onCall={onCall}
        />
      </div>

      {/* Heatmap + Event Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <FeelingsHeatmap data={heatmapData} className="lg:col-span-2" />
        <EventJournal progress={exerciseProgress} maxEvents={journalDays} />
      </div>

      {/* Set progress + Execution log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <SetProgressCard progress={setProgress} assignments={rawAssignments} className="lg:col-span-1" />
        <ExerciseExecutionLog progress={exerciseProgress} className="lg:col-span-2" />
      </div>
    </div>
  );
}
