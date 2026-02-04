/**
 * Serwis do wysyłania raportów o błędach w ćwiczeniach
 * Używany w SummaryStep do zgłaszania problemów z ćwiczeniami
 */

// ============================================================================
// TYPES
// ============================================================================

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

export interface ExerciseReportResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

let lastReportTime = 0;
const RATE_LIMIT_MS = 60000; // 60 sekund między raportami

function canSendReport(): boolean {
  const now = Date.now();
  return now - lastReportTime >= RATE_LIMIT_MS;
}

function updateLastReportTime(): void {
  lastReportTime = Date.now();
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Wysyła raport o błędzie w ćwiczeniach na Discord
 */
export async function sendExerciseReport(
  data: ExerciseReportData
): Promise<ExerciseReportResult> {
  // Rate limiting
  if (!canSendReport()) {
    const remainingSeconds = Math.ceil(
      (RATE_LIMIT_MS - (Date.now() - lastReportTime)) / 1000
    );
    return {
      success: false,
      error: `Poczekaj ${remainingSeconds} sekund przed wysłaniem kolejnego zgłoszenia`,
    };
  }

  try {
    const response = await fetch("/api/exercise-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      updateLastReportTime();
      console.log("[ExerciseReportService] Report sent successfully");
      return { success: true };
    }

    return {
      success: false,
      error: result.message || `Błąd serwera: ${response.status}`,
    };
  } catch (error) {
    console.error("[ExerciseReportService] Error sending report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nieznany błąd",
    };
  }
}
