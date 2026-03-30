/**
 * Typy dla AI Service - komunikacja z /api/ai endpoints
 */

// ============================================
// 1. Exercise Suggestion
// ============================================

export interface ExerciseSuggestionRequest {
  exerciseName: string;
  availableTags?: string[];
  /** Lista nazw istniejących ćwiczeń w bazie - AI sprawdzi duplikaty */
  existingExerciseNames?: string[];
}

/**
 * Pojedyncza korekta/sugestia AI z uzasadnieniem
 */
export interface AISuggestionItem {
  field: string; // np. 'name', 'description', 'reps', 'duration'
  original: string | number | null;
  suggested: string | number | null;
  reason: string; // "Wykryto literówkę", "Standard FiziYo", "Optymalizacja pod hipertrofię"
  priority: 'high' | 'medium' | 'low';
}

/**
 * Podpowiedź AI dotycząca danych
 */
export interface AIBiomechanicalWarning {
  type: 'reps_too_high' | 'reps_too_low' | 'duration_too_short' | 'duration_too_long' | 'technique_concern';
  message: string;
  suggestion: string;
  severity: 'warning' | 'info';
}

export interface ExerciseSuggestionResponse {
  // === Podstawowe sugestie (zachowane dla kompatybilności) ===
  description: string;
  type: 'reps' | 'time';
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
  confidence: number;

  // === Asystent Redakcyjny (nowe) ===

  /** Poprawiona nazwa (Physio-Grammarly) - null jeśli bez zmian */
  correctedName: string | null;

  /** Powód korekty nazwy */
  nameCorrection: {
    reason: string; // "Literówka", "Błąd fleksyjny", "Standard kliniczny"
    original: string;
  } | null;

  /** Kategorie sugestii (The "Why") */
  corrections: {
    naming: AISuggestionItem[]; // 🔤 Nazewnictwo (literówki, fleksja)
    content: AISuggestionItem[]; // 📝 Treść (opis, tagi)
    parameters: AISuggestionItem[]; // ⚡ Parametry (tylko jeśli nielogiczne)
  };

  /** Podpowiedzi AI */
  warnings: AIBiomechanicalWarning[];

  /** Zaawansowane parametry (Pro Tuning) */
  advancedParams: {
    tempo: string | null; // np. "3010"
    weight: string | null; // np. "20kg" lub "RPE 7"
    rangeOfMotion: string | null; // np. "Pełen zakres"
    preparationTime: number | null; // sekundy
    executionTime: number | null; // czas pojedynczego powtórzenia
  } | null;

  /** Informacja o podobnych ćwiczeniach w bazie (wykryte przez AI) */
  similarInDatabase: {
    /** Dokładne dopasowanie - ćwiczenie już istnieje! */
    exactMatch: string | null;
    /** Lista podobnych nazw (max 3) */
    similar: string[];
  } | null;
}

// ============================================
// 2. Set Generation
// ============================================

export interface SetNameSuggestRequest {
  currentName: string;
  exerciseNames: string[];
}

export interface SetNameSuggestResponse {
  suggestedName: string;
}

export interface PatientContext {
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
}

export interface SetGenerationRequest {
  prompt: string;
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
  availableExerciseNames: string[];
}

export interface GeneratedExercise {
  name: string;
  matchedExerciseName: string | null;
  sets: number;
  reps: number | null;
  duration: number | null;
  reasoning: string;
}

export interface SetGenerationResponse {
  exercises: GeneratedExercise[];
  setName: string;
  setDescription: string;
}

// ============================================
// 3. Clinical Notes
// ============================================

export type ClinicalNoteAction = 'expand' | 'summarize' | 'suggest' | 'format';

export interface ClinicalNoteRequest {
  currentNote: string;
  action: ClinicalNoteAction;
  patientContext?: string;
  exerciseSetContext?: string;
}

export interface ClinicalNoteResponse {
  suggestedNote: string;
  keyPoints: string[];
}

// ============================================
// 4. Voice Parse
// ============================================

export interface VoiceParseRequest {
  voiceText: string;
}

export interface VoiceParseResponse {
  name: string;
  description: string;
  type: 'reps' | 'time';
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
}

// ============================================
// 5. Exercise Image Generation
// ============================================

export type ImageStyle = 'illustration' | 'diagram' | 'photo';

export interface ExerciseImageRequest {
  exerciseName: string;
  exerciseDescription?: string;
  exerciseType?: 'reps' | 'time';
  style?: ImageStyle;
}

export interface ExerciseImageResponse {
  imageBase64: string;
  contentType: string;
  prompt: string;
  success: boolean;
  errorMessage?: string;
  /** Opis tekstowy wygenerowany przez AI (gdy model zwraca tekst zamiast obrazu) */
  textDescription?: string;
  /** Czy odpowiedź zawiera tylko tekst (bez obrazu) */
  isTextOnly?: boolean;
}

// ============================================
// 6. Video Analysis (AI Auto-Analysis dla weryfikacji)
// ============================================

export type DifficultyLevelType = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface AIVideoAnalysisRequest {
  exerciseId: string;
  exerciseName: string;
  videoUrl?: string;
  existingTags?: string[];
}

/**
 * Odpowiedź z AI Video Analysis - używana do auto-wypełniania parametrów ćwiczenia
 * Na razie używa fallback na getExerciseSuggestion, docelowo będzie analizować wideo
 */
export interface AIVideoAnalysisResponse {
  /** Tempo ćwiczenia w formacie "X-Y-Z" (eccentric-pause-concentric) */
  tempo: string | null;
  /** Czas wykonania jednego powtórzenia (sekundy) */
  executionTime: number | null;
  /** Opis kliniczny (żargon medyczny, biomechanika) */
  clinicalDescription: string | null;
  /** Opis dla pacjenta (prosty język) */
  patientDescription: string | null;
  /** Audio cue - tekst lektora do odtworzenia */
  audioCue: string | null;
  /** Sugerowane tagi */
  suggestedTags: string[];
  /** Poziom trudności */
  difficultyLevel: DifficultyLevelType | null;
  /** Przerwa między seriami (sekundy) */
  restBetweenSets: number | null;
  /** Przerwa między powtórzeniami (sekundy) */
  restBetweenReps: number | null;
  /** Czas przygotowania (sekundy) */
  preparationTime: number | null;
  /** Domyślna liczba serii */
  sets: number | null;
  /** Domyślna liczba powtórzeń */
  reps: number | null;
  /** Domyślny czas trwania (sekundy) */
  duration: number | null;
  /** Typ ćwiczenia */
  type: 'reps' | 'time' | null;
  /** Strona ciała */
  side: 'none' | 'left' | 'right' | 'both' | 'alternating' | null;
  /** Pewność sugestii AI (0-1) */
  confidence: number;
  /** Lista pól które zostały wypełnione przez AI */
  updatedFields: string[];
}
