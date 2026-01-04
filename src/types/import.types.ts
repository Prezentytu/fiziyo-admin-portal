/**
 * Typy dla importu dokumentów fizjoterapeutycznych
 */

// ============================================
// Document Analysis Response
// ============================================

/**
 * Wynik analizy dokumentu przez AI
 */
export interface DocumentAnalysisResult {
  /** Wyekstrahowane ćwiczenia */
  exercises: ExtractedExercise[];

  /** Wyekstrahowane zestawy ćwiczeń */
  exerciseSets: ExtractedExerciseSet[];

  /** Wyekstrahowane notatki kliniczne */
  clinicalNotes: ExtractedClinicalNote[];

  /** Sugestie dopasowania do istniejących ćwiczeń */
  matchSuggestions: Record<string, MatchSuggestion[]>;

  /** Metadane dokumentu */
  documentInfo: DocumentInfo;

  /** Surowy tekst (debug) */
  rawText?: string;
}

/**
 * Metadane dokumentu
 */
export interface DocumentInfo {
  patientName?: string;
  date?: string;
  therapistName?: string;
  clinicName?: string;
  documentType?: string;
}

/**
 * Ćwiczenie wyekstrahowane z dokumentu
 */
export interface ExtractedExercise {
  tempId: string;
  name: string;
  description?: string;
  type: 'reps' | 'time' | 'hold';
  sets?: number;
  reps?: number;
  duration?: number;
  holdTime?: number;
  restBetweenSets?: number;
  restBetweenReps?: number;
  exerciseSide?: 'none' | 'left' | 'right' | 'both' | 'alternating';
  suggestedTags: string[];
  notes?: string;
  confidence: number;
  sourceLineNumber?: number;
  originalText?: string;
}

/**
 * Zestaw ćwiczeń wyekstrahowany
 */
export interface ExtractedExerciseSet {
  tempId: string;
  name: string;
  description?: string;
  exerciseTempIds: string[];
  suggestedFrequency?: string;
  confidence: number;
}

/**
 * Notatka kliniczna wyekstrahowana
 */
export interface ExtractedClinicalNote {
  tempId: string;
  noteType: 'interview' | 'examination' | 'diagnosis' | 'procedure' | 'other';
  title?: string;
  content: string;
  points?: string[];
  confidence: number;
}

/**
 * Sugestia dopasowania do istniejącego ćwiczenia
 */
export interface MatchSuggestion {
  existingExerciseId: string;
  existingExerciseName: string;
  confidence: number;
  matchReason: string;
  imageUrl?: string;
}

// ============================================
// Import Request/Response
// ============================================

/**
 * Request do batch importu
 */
export interface DocumentImportRequest {
  patientId?: string;
  exercisesToCreate: ExerciseImportItem[];
  exercisesToReuse: Record<string, string>; // tempId -> existingId
  exerciseSetsToCreate: ExerciseSetImportItem[];
  clinicalNotesToCreate: ClinicalNoteImportItem[];
  assignToPatient?: boolean;
}

/**
 * Ćwiczenie do zaimportowania
 */
export interface ExerciseImportItem {
  tempId: string;
  name: string;
  description?: string;
  type: string;
  sets: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  exerciseSide?: string;
  tagIds: string[];
  notes?: string;
}

/**
 * Zestaw do zaimportowania
 */
export interface ExerciseSetImportItem {
  tempId: string;
  name: string;
  description?: string;
  exercises: ExerciseSetMappingImportItem[];
  isTemplate?: boolean;
}

/**
 * Mapowanie ćwiczenia w zestawie
 */
export interface ExerciseSetMappingImportItem {
  exerciseTempId: string;
  order: number;
  sets?: number;
  reps?: number;
  duration?: number;
  customName?: string;
  notes?: string;
}

/**
 * Notatka do zaimportowania
 */
export interface ClinicalNoteImportItem {
  tempId: string;
  noteType: string;
  title?: string;
  content: string;
}

/**
 * Wynik importu
 */
export interface DocumentImportResult {
  success: boolean;
  message: string;
  exercisesCreated: number;
  exercisesReused: number;
  exerciseSetsCreated: number;
  clinicalNotesCreated: number;
  exerciseIdMapping: Record<string, string>;
  exerciseSetIdMapping: Record<string, string>;
  clinicalNoteIdMapping: Record<string, string>;
  errors: string[];
}

// ============================================
// UI State Types
// ============================================

/**
 * Kroki wizarda importu
 */
export type ImportWizardStep =
  | 'upload'
  | 'processing'
  | 'review-exercises'
  | 'review-sets'
  | 'summary';

/**
 * Decyzja użytkownika dla ćwiczenia
 */
export interface ExerciseDecision {
  tempId: string;
  action: 'create' | 'reuse' | 'skip';
  reuseExerciseId?: string;
  /** Edytowane dane (jeśli create) */
  editedData?: Partial<ExtractedExercise>;
}

/**
 * Decyzja użytkownika dla zestawu
 */
export interface ExerciseSetDecision {
  tempId: string;
  action: 'create' | 'skip';
  editedName?: string;
  editedDescription?: string;
}

/**
 * Decyzja użytkownika dla notatki
 */
export interface ClinicalNoteDecision {
  tempId: string;
  action: 'create' | 'skip';
  editedContent?: string;
}

/**
 * Stan całego importu
 */
export interface ImportState {
  step: ImportWizardStep;
  file: File | null;
  isAnalyzing: boolean;
  isImporting: boolean;
  analysisResult: DocumentAnalysisResult | null;
  exerciseDecisions: Record<string, ExerciseDecision>;
  setDecisions: Record<string, ExerciseSetDecision>;
  noteDecisions: Record<string, ClinicalNoteDecision>;
  selectedPatientId?: string;
  error: string | null;
  importResult: DocumentImportResult | null;
}
