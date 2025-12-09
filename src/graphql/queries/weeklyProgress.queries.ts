import { gql } from "@apollo/client";

/**
 * Query do pobierania tygodniowego progresu użytkownika
 */
export const GET_MY_WEEKLY_PROGRESS_QUERY = gql`
  query GetMyWeeklyProgress {
    myWeeklyProgress {
      scheduledDays
      completedDays
      percentComplete
      exercisesThisWeek
      weekStartDate
      weekEndDate
      dayStatuses {
        day
        isScheduled
        isCompleted
        isToday
      }
    }
  }
`;

/**
 * Query do pobierania harmonogramu tygodniowego
 */
export const GET_MY_WEEKLY_SCHEDULE_QUERY = gql`
  query GetMyWeeklySchedule {
    myWeeklySchedule {
      weekStartDate
      weekEndDate
      dailySchedules {
        date
        dayOfWeek
        isToday
        totalExercises
        completedExercises
        exercises {
          exerciseId
          exerciseName
          exerciseSetId
          exerciseSetName
          assignmentId
          isCompleted
          type
          sets
          reps
          duration
        }
      }
    }
  }
`;

/**
 * Query do pobierania ćwiczeń na dzisiaj
 */
export const GET_MY_TODAY_EXERCISES_QUERY = gql`
  query GetMyTodayExercises {
    myTodayExercises {
      exerciseId
      exerciseName
      exerciseSetId
      exerciseSetName
      assignmentId
      isCompleted
      type
      sets
      reps
      duration
    }
  }
`;

// TypeScript types
export interface DayStatus {
  day: string; // DayOfWeek enum jako string
  isScheduled: boolean;
  isCompleted: boolean;
  isToday: boolean;
}

export interface WeeklyProgressData {
  scheduledDays: number;
  completedDays: number;
  percentComplete: number;
  exercisesThisWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  dayStatuses: DayStatus[];
}

export interface ScheduledExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseSetId?: string;
  exerciseSetName?: string;
  assignmentId: string;
  isCompleted: boolean;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
}

export interface DailySchedule {
  date: string;
  dayOfWeek: string;
  isToday: boolean;
  totalExercises: number;
  completedExercises: number;
  exercises: ScheduledExercise[];
}

export interface WeeklySchedule {
  weekStartDate: string;
  weekEndDate: string;
  dailySchedules: DailySchedule[];
}













