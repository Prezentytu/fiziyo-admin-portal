import type {
  CreateExerciseReportInput,
  ExerciseReport,
  ExerciseReportPage,
  ExerciseReportApiResponse,
} from '@/types/exercise-report.types';

export interface ExerciseInfo {
  id: string;
  name: string;
  exerciseId?: string;
}

export interface PatientInfo {
  id: string;
  name: string;
}

export interface ExerciseReportData {
  message: string;
  exerciseSet: {
    id: string;
    name: string;
    exercises: ExerciseInfo[];
  };
  patients: PatientInfo[];
  reporter: {
    userId: string;
    email: string;
    name?: string;
  };
  organizationId: string;
}

interface ExerciseReportResult {
  success: boolean;
  error?: string;
}

interface ResolveExerciseReportPayload {
  exerciseId?: string;
  reportId?: string;
  resolvedByUserId: string;
  resolutionNote?: string;
}

let lastReportTime = 0;
const RATE_LIMIT_MS = 60000;

function canSendReport(): boolean {
  return Date.now() - lastReportTime >= RATE_LIMIT_MS;
}

function updateLastReportTime(): void {
  lastReportTime = Date.now();
}

async function parseApiResponse(response: Response): Promise<ExerciseReportApiResponse> {
  try {
    return (await response.json()) as ExerciseReportApiResponse;
  } catch {
    return {
      success: false,
      error: 'Nie udało się odczytać odpowiedzi serwera',
    };
  }
}

/**
 * Legacy flow z Assignment Wizard (zostaje dla kompatybilności).
 */
export async function sendExerciseReport(data: ExerciseReportData): Promise<ExerciseReportResult> {
  if (!canSendReport()) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastReportTime)) / 1000);
    return {
      success: false,
      error: `Poczekaj ${remainingSeconds} sekund przed wysłaniem kolejnego zgłoszenia`,
    };
  }

  try {
    const response = await fetch('/api/exercise-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await parseApiResponse(response);

    if (response.ok && result.success) {
      updateLastReportTime();
      return { success: true };
    }

    return {
      success: false,
      error: result.message || result.error || `Błąd serwera: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nieznany błąd',
    };
  }
}

/**
 * Nowy flow: zgłoszenie pojedynczego ćwiczenia do verification.
 */
export async function createExerciseReport(input: CreateExerciseReportInput): Promise<ExerciseReportApiResponse> {
  try {
    const response = await fetch('/api/exercise-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'EXERCISE_REPORT',
        ...input,
      }),
    });

    return await parseApiResponse(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nieznany błąd',
    };
  }
}

export async function getExerciseReports(params?: {
  exerciseId?: string;
  status?: 'OPEN' | 'RESOLVED';
  exerciseIds?: string[];
}): Promise<ExerciseReport[]> {
  const queryParams = new URLSearchParams();
  if (params?.exerciseId) {
    queryParams.set('exerciseId', params.exerciseId);
  }
  if (params?.status) {
    queryParams.set('status', params.status);
  }
  if (params?.exerciseIds && params.exerciseIds.length > 0) {
    queryParams.set('exerciseIds', params.exerciseIds.join(','));
  }

  const query = queryParams.toString();
  const url = query ? `/api/exercise-reports?${query}` : '/api/exercise-reports';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const result = await parseApiResponse(response);
    return result.reports ?? [];
  } catch {
    return [];
  }
}

export async function getExerciseReportsPage(params?: {
  status?: 'OPEN' | 'RESOLVED';
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ExerciseReportPage> {
  const queryParams = new URLSearchParams();
  if (params?.status) {
    queryParams.set('status', params.status);
  }
  if (params?.search) {
    queryParams.set('search', params.search);
  }
  if (params?.page) {
    queryParams.set('page', String(params.page));
  }
  if (params?.pageSize) {
    queryParams.set('pageSize', String(params.pageSize));
  }

  const query = queryParams.toString();
  const url = query ? `/api/exercise-reports?${query}` : '/api/exercise-reports';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const result = await parseApiResponse(response);
    if (result.page) {
      return result.page;
    }

    const reports = result.reports ?? [];
    return {
      reports,
      totalCount: reports.length,
      page: 1,
      pageSize: reports.length > 0 ? reports.length : 20,
      totalPages: reports.length > 0 ? 1 : 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  } catch {
    return {
      reports: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
}

export async function resolveExerciseReports(payload: ResolveExerciseReportPayload): Promise<ExerciseReportApiResponse> {
  try {
    const response = await fetch('/api/exercise-reports', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return await parseApiResponse(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nieznany błąd',
    };
  }
}
