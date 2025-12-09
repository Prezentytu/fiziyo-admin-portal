import { gql } from "@apollo/client";

/**
 * Query do pobierania statystyk punktów zdrowia użytkownika
 */
export const GET_MY_HEALTH_STATS_QUERY = gql`
  query GetMyHealthStats {
    myHealthStats {
      totalHealthPoints
      pointsEarnedThisWeek
      exercisesCompletedThisWeek
      currentStreak
    }
  }
`;

/**
 * Query do pobierania sumy punktów zdrowia
 */
export const GET_MY_TOTAL_HEALTH_POINTS_QUERY = gql`
  query GetMyTotalHealthPoints {
    myTotalHealthPoints
  }
`;

/**
 * Query do pobierania aktualnego streak
 */
export const GET_MY_CURRENT_STREAK_QUERY = gql`
  query GetMyCurrentStreak {
    myCurrentStreak
  }
`;

/**
 * Query do pobierania historii punktów
 */
export const GET_MY_HEALTH_POINTS_HISTORY_QUERY = gql`
  query GetMyHealthPointsHistory($limit: Int) {
    myHealthPointsHistory(limit: $limit) {
      id
      date
      points
      description
      pointType
      exerciseId
    }
  }
`;

/**
 * Query do pobierania punktów zdobytych w tym tygodniu
 */
export const GET_MY_POINTS_THIS_WEEK_QUERY = gql`
  query GetMyPointsThisWeek {
    myPointsThisWeek
  }
`;

/**
 * Mutation do przyznawania punktów za ćwiczenie
 */
export const AWARD_EXERCISE_POINTS_MUTATION = gql`
  mutation AwardExercisePoints($exerciseId: String!, $exerciseSetId: String, $assignmentId: String) {
    awardExercisePoints(exerciseId: $exerciseId, exerciseSetId: $exerciseSetId, assignmentId: $assignmentId) {
      id
      points
      description
      pointType
      date
    }
  }
`;

// TypeScript types
export interface WeeklyHealthStats {
  totalHealthPoints: number;
  pointsEarnedThisWeek: number;
  exercisesCompletedThisWeek: number;
  currentStreak: number;
}

export interface HealthPointsEntry {
  id: string;
  date: string;
  points: number;
  description: string;
  pointType: string;
  exerciseId?: string;
}













