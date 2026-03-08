export type ExerciseReportReasonCategory =
  | 'WRONG_DESCRIPTION'
  | 'WRONG_MEDIA'
  | 'CLINICAL_RISK'
  | 'DUPLICATE'
  | 'OUTDATED_CONTENT'
  | 'OTHER';

export type ExerciseReportStatus = 'OPEN' | 'RESOLVED';

export type ExerciseReportRoutingTarget = 'PENDING_REVIEW' | 'UPDATE_PENDING';

export interface ExerciseReportAuthor {
  userId: string;
  email: string;
  name?: string;
}

export interface ExerciseReportAttachment {
  name: string;
  size: number;
  type: string;
}

export interface CreateExerciseReportInput {
  exerciseId: string;
  exerciseName: string;
  exerciseScope?: 'PERSONAL' | 'ORGANIZATION' | 'GLOBAL';
  exerciseStatus?:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'CHANGES_REQUESTED'
    | 'APPROVED'
    | 'PUBLISHED'
    | 'REJECTED'
    | 'ARCHIVED_GLOBAL'
    | 'UPDATE_PENDING';
  organizationId?: string;
  reasonCategory: ExerciseReportReasonCategory;
  description: string;
  attachments?: ExerciseReportAttachment[];
  reportedBy: ExerciseReportAuthor;
}

export interface ExerciseReport {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseScope?: string;
  exerciseStatus?: string;
  organizationId?: string;
  reasonCategory: ExerciseReportReasonCategory;
  description: string;
  attachments: ExerciseReportAttachment[];
  status: ExerciseReportStatus;
  routingTarget: ExerciseReportRoutingTarget;
  reportedBy: ExerciseReportAuthor;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolutionNote?: string;
}

export interface ExerciseReportApiResponse {
  success: boolean;
  message?: string;
  report?: ExerciseReport;
  reports?: ExerciseReport[];
  error?: string;
}
