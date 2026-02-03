"use client";

import { useQuery } from "@apollo/client/react";
import { Activity } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

import { TherapyStatusCard } from "./TherapyStatusCard";
import { FeelingsHeatmap } from "./FeelingsHeatmap";
import { EventJournal } from "./EventJournal";
import { NextStepCard } from "./NextStepCard";

import { GET_EXERCISE_PROGRESS_BY_USER_QUERY } from "@/graphql/queries/exerciseProgress.queries";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import {
  calculateTherapyStatus,
  generateHeatmapData,
  formatRelativeDate,
  type ExerciseProgressData,
  type PatientAssignmentData,
} from "@/lib/therapyStatus";

interface ActivityReportProps {
  patientId: string;
  patientName?: string;
  onSendMessage?: () => void;
  onSendPraise?: () => void;
  onEditPlan?: () => void;
  onCall?: () => void;
}

export function ActivityReport({
  patientId,
  patientName,
  onSendMessage,
  onSendPraise,
  onEditPlan,
  onCall,
}: ActivityReportProps) {
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

  // Map to ExerciseProgressData type with all needed fields
  const exerciseProgress: ExerciseProgressData[] =
    ((progressData as any)?.exerciseProgress || []).map((p: any) => ({
      id: p.id,
      completedAt: p.completedAt,
      status: p.status,
      painLevel: p.painLevel,
      difficultyLevel: p.difficultyLevel,
      patientNotes: p.patientNotes,
    }));

  const rawAssignments = (assignmentsData as any)?.patientAssignments || [];
  
  // Map to PatientAssignmentData for therapy status calculation
  const assignmentsForStatus: PatientAssignmentData[] = rawAssignments.map((a: any) => ({
    id: a.id,
    startDate: a.startDate,
    endDate: a.endDate,
    status: a.status,
    frequency: a.frequency,
  }));

  // Calculate therapy status (with assignments for proper schedule awareness)
  const therapyStatus = calculateTherapyStatus(exerciseProgress, assignmentsForStatus);

  // Generate heatmap data (with assignments for proper schedule awareness)
  const heatmapData = generateHeatmapData(exerciseProgress, assignmentsForStatus);

  // Get last activity label
  const lastActivity = exerciseProgress
    .filter(p => p.completedAt && p.status === 'completed')
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
  
  const lastActivityLabel = lastActivity?.completedAt 
    ? formatRelativeDate(lastActivity.completedAt)
    : undefined;

  if (isLoading) {
    return <LoadingState type="text" count={3} />;
  }

  if (exerciseProgress.length === 0 && rawAssignments.length === 0) {
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
      {/* Header Row: Status + Next Step */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Content Row: Heatmap + Event Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FeelingsHeatmap data={heatmapData} className="lg:col-span-2" />
        <EventJournal progress={exerciseProgress} maxEvents={5} />
      </div>
    </div>
  );
}
