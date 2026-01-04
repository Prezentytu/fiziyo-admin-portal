import { getBackendToken } from "@/lib/tokenCache";
import type {
  DocumentAnalysisResult,
  DocumentImportRequest,
  DocumentImportResult,
} from "@/types/import.types";

const isDev = process.env.NODE_ENV === "development";

/**
 * Serwis do importu dokumentów fizjoterapeutycznych przez AI
 */
class DocumentImportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  }

  /**
   * Pobiera nagłówki autoryzacji
   */
  private getAuthHeaders(): HeadersInit {
    const token = getBackendToken();
    if (!token) {
      throw new Error("Brak tokenu autoryzacji. Zaloguj się ponownie.");
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Analizuje plik dokumentu (PDF, Excel, CSV, TXT)
   */
  async analyzeDocument(
    file: File,
    patientId?: string,
    additionalContext?: string
  ): Promise<DocumentAnalysisResult> {
    const url = `${this.baseUrl}/api/ai/document-analyze`;

    const formData = new FormData();
    formData.append("file", file);
    if (patientId) {
      formData.append("patientId", patientId);
    }
    if (additionalContext) {
      formData.append("additionalContext", additionalContext);
    }

    if (isDev) {
      console.log("[DocumentImportService] Analyzing document:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        patientId,
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesja wygasła. Odśwież stronę i spróbuj ponownie.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Błąd analizy dokumentu: ${response.status}`
        );
      }

      const data: DocumentAnalysisResult = await response.json();

      if (isDev) {
        console.log("[DocumentImportService] Analysis result:", {
          exercises: data.exercises.length,
          sets: data.exerciseSets.length,
          notes: data.clinicalNotes.length,
          documentInfo: data.documentInfo,
        });
      }

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[DocumentImportService] Analysis error:", error);
      }
      throw error;
    }
  }

  /**
   * Analizuje tekst bezpośrednio (bez pliku)
   */
  async analyzeText(
    text: string,
    patientId?: string,
    additionalContext?: string
  ): Promise<DocumentAnalysisResult> {
    const url = `${this.baseUrl}/api/ai/document-analyze-text`;

    if (isDev) {
      console.log("[DocumentImportService] Analyzing text:", {
        textLength: text.length,
        patientId,
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          patientId,
          additionalContext,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesja wygasła. Odśwież stronę i spróbuj ponownie.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Błąd analizy tekstu: ${response.status}`
        );
      }

      const data: DocumentAnalysisResult = await response.json();

      if (isDev) {
        console.log("[DocumentImportService] Text analysis result:", {
          exercises: data.exercises.length,
          sets: data.exerciseSets.length,
          notes: data.clinicalNotes.length,
        });
      }

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[DocumentImportService] Text analysis error:", error);
      }
      throw error;
    }
  }

  /**
   * Importuje dane do bazy
   */
  async importData(
    request: DocumentImportRequest
  ): Promise<DocumentImportResult> {
    const url = `${this.baseUrl}/api/ai/document-import`;

    if (isDev) {
      console.log("[DocumentImportService] Importing data:", {
        exercisesToCreate: request.exercisesToCreate.length,
        exercisesToReuse: Object.keys(request.exercisesToReuse).length,
        setsToCreate: request.exerciseSetsToCreate.length,
        notesToCreate: request.clinicalNotesToCreate.length,
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data: DocumentImportResult = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Błąd importu: ${response.status}`);
      }

      if (isDev) {
        console.log("[DocumentImportService] Import result:", {
          success: data.success,
          exercisesCreated: data.exercisesCreated,
          exercisesReused: data.exercisesReused,
          setsCreated: data.exerciseSetsCreated,
          notesCreated: data.clinicalNotesCreated,
        });
      }

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[DocumentImportService] Import error:", error);
      }
      throw error;
    }
  }

  /**
   * Obsługiwane formaty plików
   */
  getSupportedFormats(): string[] {
    return [
      ".pdf",
      ".xlsx",
      ".xls",
      ".csv",
      ".txt",
      ".md",
    ];
  }

  /**
   * Sprawdza czy format pliku jest obsługiwany
   */
  isFormatSupported(file: File): boolean {
    const extension = file.name.toLowerCase().split(".").pop();
    const supportedExtensions = ["pdf", "xlsx", "xls", "csv", "txt", "md"];
    return supportedExtensions.includes(extension || "");
  }

  /**
   * Maksymalny rozmiar pliku (10MB)
   */
  getMaxFileSizeMB(): number {
    return 10;
  }

  /**
   * Sprawdza rozmiar pliku
   */
  isFileSizeValid(file: File): boolean {
    return file.size <= this.getMaxFileSizeMB() * 1024 * 1024;
  }
}

// Singleton instance
export const documentImportService = new DocumentImportService();
