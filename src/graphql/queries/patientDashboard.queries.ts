import { gql } from "@apollo/client";

/**
 * Query do pobierania kompletnych danych dashboardu pacjenta
 * Zwraca wszystkie potrzebne informacje w jednym zapytaniu:
 * - Konteksty leczenia (treatment contexts)
 * - Aktywne zestawy ćwiczeń
 * - Ostatnie postępy
 * - Statystyki
 */
export const GET_PATIENT_DASHBOARD_QUERY = gql`
  query GetPatientDashboard {
    patientDashboard {
      treatmentContexts {
        assignmentId
        therapistName
        organizationName
        clinicName
        contextType
        contextLabel
        contextColor
        activeExerciseCount
        lastActivity
      }
      activeExerciseSets {
        setId
        setName
        assignmentId
        contextLabel
        contextColor
        assignedAt
        completionPercentage
        exercises {
          id
          name
          type
          side
          defaultSets
          defaultReps
          defaultDuration
          imageUrl
          scope
        }
      }
      recentProgress {
        id
        userId
        assignmentId
        exerciseId
        exerciseSetId
        completedAt
        status
        completedReps
        completedSets
        completedTime
        difficultyLevel
        notes
        patientNotes
        rating
        painLevel
        realDuration
      }
      stats {
        totalExerciseSets
        completedSessions
        totalTherapists
        totalOrganizations
        lastActivityDate
        currentStreak
        averageCompletionRate
      }
    }
  }
`;

/**
 * TypeScript types dla Patient Dashboard
 */
export interface TreatmentContext {
  assignmentId: string;
  therapistName: string;
  organizationName: string;
  clinicName?: string;
  contextType: string;
  contextLabel: string;
  contextColor: string;
  activeExerciseCount: number;
  lastActivity?: string;
}

export interface PatientExerciseSet {
  setId: string;
  setName: string;
  assignmentId: string;
  contextLabel: string;
  contextColor: string;
  assignedAt: string;
  completionPercentage: number;
  exercises: Array<{
    id: string;
    name: string;
    type: string;
    side?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    imageUrl?: string;
    scope: string;
  }>;
}

export interface ExerciseProgress {
  id: string;
  userId: string;
  assignmentId: string;
  exerciseId: string;
  exerciseSetId?: string;
  completedAt?: string;
  status: string;
  completedReps?: number;
  completedSets?: number;
  completedTime?: number;
  difficultyLevel?: number;
  notes?: string;
  patientNotes?: string;
  rating?: number;
  painLevel?: number;
  realDuration?: number;
}

export interface PatientStats {
  totalExerciseSets: number;
  completedSessions: number;
  totalTherapists: number;
  totalOrganizations: number;
  lastActivityDate?: string;
  currentStreak: number;
  averageCompletionRate: number;
}

export interface PatientDashboardData {
  treatmentContexts: TreatmentContext[];
  activeExerciseSets: PatientExerciseSet[];
  recentProgress: ExerciseProgress[];
  stats: PatientStats;
}

export interface GetPatientDashboardData {
  patientDashboard: PatientDashboardData;
}














