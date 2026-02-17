/**
 * Centralny serwis AI - komunikacja z dedykowanymi endpointami /api/ai/*
 * Zastępuje exerciseAIService.ts - teraz backend gwarantuje JSON
 */

import { getBackendToken } from '@/lib/tokenCache';
import { triggerCreditsRefresh } from '@/components/settings/AICreditsPanel';
import type {
  ExerciseSuggestionRequest,
  ExerciseSuggestionResponse,
  SetGenerationRequest,
  SetGenerationResponse,
  ClinicalNoteRequest,
  ClinicalNoteResponse,
  VoiceParseRequest,
  VoiceParseResponse,
  PatientContext,
  ClinicalNoteAction,
  ExerciseImageRequest,
  ExerciseImageResponse,
  ImageStyle,
} from '@/types/ai.types';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Centralny serwis AI z dedykowanymi endpointami
 */
class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Wykonuje request do AI endpoint
   */
  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const token = getBackendToken();

    if (!token) {
      throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
    }

    const url = `${this.baseUrl}/api/ai/${endpoint}`;

    if (isDev) {
      console.log(`[AIService] Request to ${endpoint}:`, body);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesja wygasła. Odśwież stronę i spróbuj ponownie.');
      }
      const errorText = await response.text();
      throw new Error(`Błąd AI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (isDev) {
      console.log(`[AIService] Response from ${endpoint}:`, data);
    }

    // Odśwież kredyty po udanej akcji AI
    triggerCreditsRefresh();

    return data as T;
  }

  // ============================================
  // 1. Exercise Suggestion
  // ============================================

  /**
   * Generuje sugestie parametrów dla ćwiczenia na podstawie nazwy
   * @param exerciseName - nazwa ćwiczenia (min. 2 znaki)
   * @param availableTags - opcjonalna lista dostępnych tagów
   * @param existingExerciseNames - opcjonalna lista nazw istniejących ćwiczeń (do wykrywania duplikatów)
   * @returns sugestia lub null w przypadku błędu
   */
  async getExerciseSuggestion(
    exerciseName: string,
    availableTags?: string[],
    existingExerciseNames?: string[]
  ): Promise<ExerciseSuggestionResponse | null> {
    if (!exerciseName.trim() || exerciseName.length < 2) {
      return null;
    }

    try {
      const request: ExerciseSuggestionRequest = {
        exerciseName: exerciseName.trim(),
        availableTags,
        existingExerciseNames,
      };

      return await this.request<ExerciseSuggestionResponse>('exercise-suggest', request);
    } catch (error) {
      if (isDev) {
        console.error('[AIService] getExerciseSuggestion error:', error);
      }
      return null;
    }
  }

  // ============================================
  // 2. Set Generation
  // ============================================

  /**
   * Generuje zestaw ćwiczeń na podstawie opisu potrzeb
   * @param prompt - opis celu zestawu
   * @param patientContext - opcjonalny kontekst pacjenta
   * @param exerciseNames - lista nazw dostępnych ćwiczeń
   * @returns wygenerowany zestaw lub null
   */
  async generateExerciseSet(
    prompt: string,
    patientContext?: PatientContext,
    exerciseNames: string[] = []
  ): Promise<SetGenerationResponse | null> {
    if (!prompt.trim()) {
      return null;
    }

    try {
      const request: SetGenerationRequest = {
        prompt: prompt.trim(),
        patientName: patientContext?.patientName,
        diagnosis: patientContext?.diagnosis,
        painLocation: patientContext?.painLocation,
        availableExerciseNames: exerciseNames,
      };

      return await this.request<SetGenerationResponse>('set-generate', request);
    } catch (error) {
      if (isDev) {
        console.error('[AIService] generateExerciseSet error:', error);
      }
      return null;
    }
  }

  // ============================================
  // 3. Clinical Notes
  // ============================================

  /**
   * Asystent notatek
   * @param currentNote - aktualna treść notatki
   * @param action - akcja do wykonania: expand, summarize, suggest, format
   * @param patientContext - opcjonalny kontekst pacjenta
   * @param exerciseSetContext - opcjonalny kontekst zestawu ćwiczeń
   * @returns sugerowana notatka lub null
   */
  async assistClinicalNote(
    currentNote: string,
    action: ClinicalNoteAction,
    patientContext?: string,
    exerciseSetContext?: string
  ): Promise<ClinicalNoteResponse | null> {
    try {
      const request: ClinicalNoteRequest = {
        currentNote,
        action,
        patientContext,
        exerciseSetContext,
      };

      return await this.request<ClinicalNoteResponse>('clinical-notes', request);
    } catch (error) {
      if (isDev) {
        console.error('[AIService] assistClinicalNote error:', error);
      }
      return null;
    }
  }

  // ============================================
  // 4. Voice Parse
  // ============================================

  /**
   * Parsuje tekst z voice input na strukturę ćwiczenia
   * @param voiceText - tekst rozpoznany z mowy
   * @returns sparsowane ćwiczenie lub null
   */
  async parseVoiceInput(voiceText: string): Promise<VoiceParseResponse | null> {
    if (!voiceText.trim()) {
      return null;
    }

    try {
      const request: VoiceParseRequest = {
        voiceText: voiceText.trim(),
      };

      return await this.request<VoiceParseResponse>('voice-parse', request);
    } catch (error) {
      if (isDev) {
        console.error('[AIService] parseVoiceInput error:', error);
      }
      return null;
    }
  }

  // ============================================
  // 5. Image Generation
  // ============================================

  /**
   * Generuje obraz ćwiczenia za pomocą AI (Gemini 2.5 Flash Image)
   * @param exerciseName - nazwa ćwiczenia
   * @param exerciseDescription - opcjonalny opis techniki
   * @param exerciseType - opcjonalny typ ćwiczenia
   * @param style - styl obrazu: illustration (domyślny), diagram, photo
   * @returns wygenerowany obraz jako File lub null w przypadku błędu
   */
  /**
   * Generuje obraz dla ćwiczenia używając AI
   * Może zwrócić:
   * - obraz jako File + response
   * - tylko tekst (isTextOnly: true) gdy model nie wygenerował obrazu
   * - null w przypadku błędu
   */
  async generateExerciseImage(
    exerciseName: string,
    exerciseDescription?: string,
    exerciseType?: 'reps' | 'time',
    style: ImageStyle = 'illustration'
  ): Promise<{ file?: File; response: ExerciseImageResponse } | null> {
    if (!exerciseName.trim() || exerciseName.length < 2) {
      return null;
    }

    try {
      const request: ExerciseImageRequest = {
        exerciseName: exerciseName.trim(),
        exerciseDescription,
        exerciseType,
        style,
      };

      const response = await this.request<ExerciseImageResponse>('generate-image', request);

      // Przypadek 1: Model zwrócił tekst zamiast obrazu
      if (response.success && response.isTextOnly && response.textDescription) {
        if (isDev) {
          console.info('[AIService] generateExerciseImage returned text description');
        }
        return { response }; // Zwracamy response bez pliku
      }

      // Przypadek 2: Błąd
      if (!response.success || !response.imageBase64) {
        if (isDev) {
          console.error('[AIService] generateExerciseImage failed:', response.errorMessage);
        }
        return null;
      }

      // Przypadek 3: Sukces - mamy obraz
      // Konwertuj base64 na File
      const byteCharacters = atob(response.imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Określ rozszerzenie pliku na podstawie content type
      const extension = response.contentType.includes('png')
        ? 'png'
        : response.contentType.includes('jpeg')
          ? 'jpg'
          : 'png';

      const blob = new Blob([byteArray], { type: response.contentType });
      const fileName = `ai-generated-${exerciseName.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
      const file = new File([blob], fileName, { type: response.contentType });

      return { file, response };
    } catch (error) {
      if (isDev) {
        console.error('[AIService] generateExerciseImage error:', error);
      }
      return null;
    }
  }
}

// Singleton instance
export const aiService = new AIService();

// Quick Templates - najpopularniejsze ćwiczenia fizjoterapeutyczne
// Konkretne nazwy ćwiczeń, nie kategorie - AI wygeneruje pełne parametry
// TOP 6 (wyświetlane domyślnie w wizardzie) są na początku listy
export const QUICK_TEMPLATES = [
  // === TOP 6 - najpopularniejsze dla fizjoterapii ===
  {
    id: 'plank',
    label: 'Plank (Deska)',
    icon: '🧘',
    category: 'Plank - ćwiczenie izometryczne wzmacniające mięśnie głębokie tułowia',
  },
  {
    id: 'glute-bridge',
    label: 'Glute Bridge (Mostek)',
    icon: '🌉',
    category: 'Glute Bridge - unoszenie bioder w leżeniu, wzmocnienie pośladków',
  },
  {
    id: 'bird-dog',
    label: 'Bird Dog',
    icon: '🐕',
    category: 'Bird Dog - stabilizacja tułowia z unoszeniem przeciwległych kończyn',
  },
  {
    id: 'cat-cow',
    label: 'Cat-Cow (Kot-Krowa)',
    icon: '🐱',
    category: 'Cat-Cow - mobilizacja kręgosłupa w klęku podpartym',
  },
  {
    id: 'hip-flexor-stretch',
    label: 'Rozciąganie zginaczy biodra',
    icon: '🧘',
    category: 'Rozciąganie mięśnia biodrowo-lędźwiowego w wykroku',
  },
  {
    id: 'shoulder-external-rotation',
    label: 'Rotacja zewnętrzna barku',
    icon: '💪',
    category: 'Rotacja zewnętrzna barku z gumą oporową',
  },

  // === Pozostałe ćwiczenia ===
  // Core & Stabilizacja
  {
    id: 'dead-bug',
    label: 'Dead Bug',
    icon: '🪲',
    category: 'Dead Bug - ćwiczenie stabilizacyjne w leżeniu na plecach',
  },

  // Biodra & Pośladki
  {
    id: 'clamshell',
    label: 'Clamshell (Muszla)',
    icon: '🐚',
    category: 'Clamshell - rotacja zewnętrzna biodra w leżeniu bokiem',
  },
  { id: 'hip-thrust', label: 'Hip Thrust', icon: '🦵', category: 'Hip Thrust - wypychanie bioder z oparciem o ławkę' },
  {
    id: 'side-lying-leg-raise',
    label: 'Wznosy nóg bokiem',
    icon: '🦿',
    category: 'Wznosy nóg w leżeniu bokiem - wzmocnienie odwodzicieli',
  },

  // Nogi & Kolana
  { id: 'squat', label: 'Przysiad', icon: '🏋️', category: 'Przysiad - podstawowe ćwiczenie wzmacniające nogi' },
  { id: 'lunge', label: 'Wykrok', icon: '🚶', category: 'Wykrok do przodu - wzmocnienie nóg i równowagi' },
  {
    id: 'wall-sit',
    label: 'Wall Sit (Krzesełko)',
    icon: '🪑',
    category: 'Wall Sit - izometryczne ćwiczenie przy ścianie',
  },
  { id: 'step-up', label: 'Step Up', icon: '🪜', category: 'Step Up - wchodzenie na stopień, wzmocnienie nóg' },

  // Plecy & Kręgosłup
  { id: 'superman', label: 'Superman', icon: '🦸', category: 'Superman - unoszenie kończyn w leżeniu na brzuchu' },
  {
    id: 'child-pose',
    label: "Child's Pose",
    icon: '🧒',
    category: "Child's Pose - pozycja dziecka, rozciąganie pleców",
  },
  { id: 'back-extension', label: 'Ekstensja pleców', icon: '🔙', category: 'Ekstensja pleców w leżeniu na brzuchu' },

  // Barki & Ramiona
  { id: 'wall-angels', label: 'Wall Angels', icon: '👼', category: 'Wall Angels - ślizg ramion po ścianie' },
  {
    id: 'band-pull-apart',
    label: 'Band Pull Apart',
    icon: '🎯',
    category: 'Band Pull Apart - rozciąganie gumy przed sobą',
  },

  // Rozciąganie
  {
    id: 'hamstring-stretch',
    label: 'Rozciąganie tylnej grupy uda',
    icon: '🦵',
    category: 'Rozciąganie mięśni kulszowo-goleniowych',
  },
  {
    id: 'piriformis-stretch',
    label: 'Rozciąganie gruszkowatego',
    icon: '🍐',
    category: 'Rozciąganie mięśnia gruszkowatego',
  },
  {
    id: 'chest-stretch',
    label: 'Rozciąganie klatki piersiowej',
    icon: '🫁',
    category: 'Rozciąganie mięśni piersiowych przy ścianie',
  },
];

// Top 6 templates IDs for quick access in wizard
export const TOP_QUICK_TEMPLATES_IDS = [
  'plank',
  'glute-bridge',
  'bird-dog',
  'cat-cow',
  'hip-flexor-stretch',
  'shoulder-external-rotation',
];

// Re-export types for convenience
export type {
  ExerciseSuggestionResponse,
  SetGenerationResponse,
  GeneratedExercise,
  ClinicalNoteResponse,
  VoiceParseResponse,
  PatientContext,
  ClinicalNoteAction,
  ExerciseImageResponse,
  ImageStyle,
} from '@/types/ai.types';
