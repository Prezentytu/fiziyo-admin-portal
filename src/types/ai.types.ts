/**
 * Typy dla AI Service - komunikacja z /api/ai endpoints
 */

// ============================================
// 1. Exercise Suggestion
// ============================================

export interface ExerciseSuggestionRequest {
  exerciseName: string;
  availableTags?: string[];
}

export interface ExerciseSuggestionResponse {
  description: string;
  type: 'reps' | 'time';
  sets: number;
  reps: number | null;
  duration: number | null;
  restSets: number;
  exerciseSide: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
  confidence: number;
}

// ============================================
// 2. Set Generation
// ============================================

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