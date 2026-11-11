export interface EnrichmentInstructionStep {
  step?: number;
  phase?: string;
  text?: string;
  image_ref?: string | null;
  duration_hint_seconds?: number;
}

export interface EnrichmentPhase {
  phase_name?: string;
  description?: string;
}

export interface EnrichmentFeedbackQuestion {
  id?: string;
  question?: string;
}

export interface EnrichmentCommonMistake {
  mistake?: string;
  fix?: string;
}

export interface EnrichmentDosingProfile {
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  rest_reps_seconds?: number;
  rest_sets_seconds?: number;
  frequency?: string;
  notes?: string;
}

export interface EnrichmentCoachingCue {
  text?: string;
  phases?: string[];
  priority?: number;
  repeat?: boolean;
}

// ============================================
// Schema v3 (SPEC-022, fizjo-app) — kanoniczny kształt EnrichmentData.
// Pola v2 poniżej pozostają na razie w typie (Faza sprzątająca usunie je po potwierdzeniu
// 100% v3 na prod) — ale edytor/widoki operują wyłącznie na v3 dzięki `toV3()`
// (src/features/verification/utils/enrichmentToV3.ts) wołanemu raz przy wczytaniu draftu.
// Patrz: docs/architecture/admin-enrichment-v3-migration-plan.md w repo fizjo-app.
// ============================================

export interface EnrichmentPatientMistakeV3 {
  mistake?: string;
  fix?: string;
}

export type EnrichmentCuePhaseV3 = 'preparation' | 'work' | 'rest';

/** Photo shown next to a step. `step` is 1-based, matching the step number shown to the patient. */
export interface EnrichmentStepImageV3 {
  step: number;
  url: string;
}

/** Exercise phase in which the voice-over reads a cue. `cue` is the 0-based index in `cues`. */
export interface EnrichmentCuePhaseLinkV3 {
  cue: number;
  phase: EnrichmentCuePhaseV3;
}

export interface ExerciseEnrichmentPatientV3 {
  summary?: string;
  steps?: string[];
  cues?: string[];
  mistakes?: EnrichmentPatientMistakeV3[];
  should_feel?: string;
  should_not_feel?: string;
  why?: string;
  when_to_do?: string;
  /** Additive (verification screen). Clients that do not know it ignore it. */
  step_images?: EnrichmentStepImageV3[];
  /** Additive (verification screen). Missing entry means the cue is read during work. */
  cue_phases?: EnrichmentCuePhaseLinkV3[];
  /** v3.3: jak wykonać ćwiczenie łatwiej. */
  easier?: string;
  /** v3.3: jak wykonać ćwiczenie trudniej. */
  harder?: string;
}

export interface ExerciseEnrichmentTherapistV3 {
  clinical_notes?: string;
  indications?: string[];
  contraindications?: string[];
  rehab_phases?: string[];
  progression_notes?: string;
  clinical_benefits?: string[];
  /** v3.3: punkty kontrolne (widoczność: fizjoterapeuta, zespół). */
  checkpoints?: EnrichmentCheckpointV33[];
  /** v3.3: uwagi kliniczne, jedno pole tekstowe; zastępuje `clinical_notes`. Pacjent nigdy nie widzi. */
  note?: string;
}

// ============================================
// Kontrakt v3.3 (FR-007): dokument v3 z nowymi kluczami, `$schema` zostaje `fiziyo-exercise-v3`.
// Wszystkie pola opcjonalne. Kody (pozycja, wzorzec, flagi, sprzęt) pochodzą ze słownika, więc są `string`.
// Odczyt idzie przez `readExerciseContent` (src/components/shared/exercise/readExerciseContent.ts).
// ============================================

export interface EnrichmentCheckpointV33 {
  text?: string;
  /** np. `frame`, `sequence`. */
  evidence?: string;
  /** np. `side`, `closeup`, `any`. */
  view?: string;
}

export interface EnrichmentContraindicationV33 {
  text?: string;
}

export interface EnrichmentSafetyFlagV33 {
  code?: string;
}

export interface EnrichmentSafetyV33 {
  /** Tekst, jeden objaw w linii. */
  stop_if?: string;
  /** Wycofane w v3.3 (zastępuje `pain_rule`); zostaje na starych rekordach. */
  intensity_guide?: string;
  requires_supervision?: boolean;
  /** v3.3: kod reguły bólu, np. `WS-3`. */
  pain_rule?: string;
  /** v3.3 */
  contraindications?: EnrichmentContraindicationV33[];
  /** v3.3 */
  flags?: EnrichmentSafetyFlagV33[];
}

export interface EnrichmentBreathingV33 {
  pattern?: string | null;
  text?: string;
}

export interface EnrichmentClassificationV33 {
  difficulty?: string;
  position?: string;
  body_region?: string[];
  muscles?: { primary?: string[]; secondary?: string[] };
  movement?: { pattern?: string; type?: string };
  /** Kody wskazań ze słownika (np. `osteoarthritis`), nie tekst. */
  indications?: string[];
  goals?: string[];
  progression_family?: string;
  structures?: string[];
  functions?: string[];
}

/** `none` | `each_side` | `alternating` | `left` | `right`. */
export type EnrichmentSideModeV33 = 'none' | 'each_side' | 'alternating' | 'left' | 'right';

export interface EnrichmentSideV33 {
  mode?: EnrichmentSideModeV33 | string;
  /** Dawka liczona na stronę. */
  per_side_dose?: boolean;
  start?: string | null;
  /** Strona pokazana na zdjęciu i filmie. */
  shown_in_media?: string | null;
}

export interface EnrichmentEquipmentItemV33 {
  code?: string;
  label?: string;
  qty?: number;
  required?: boolean;
  substitutes?: string[];
}

export interface EnrichmentPrescriptionRangeV33<T = number> {
  default?: T;
  min?: number;
  max?: number;
  source?: string;
}

export interface EnrichmentPrescriptionStepV33 {
  criterion?: string;
  next?: string[];
}

export interface EnrichmentPrescriptionV33 {
  goal?: string;
  mode?: string;
  params?: {
    sets?: EnrichmentPrescriptionRangeV33;
    reps?: EnrichmentPrescriptionRangeV33;
    rep_s?: EnrichmentPrescriptionRangeV33;
    hold_s?: EnrichmentPrescriptionRangeV33;
    rest_sets_s?: EnrichmentPrescriptionRangeV33;
    rest_reps_s?: EnrichmentPrescriptionRangeV33;
    prep_s?: EnrichmentPrescriptionRangeV33;
    tempo?: EnrichmentPrescriptionRangeV33<string>;
    rom?: EnrichmentPrescriptionRangeV33<string>;
    intensity?: EnrichmentPrescriptionRangeV33<{ scale?: string; value?: number }>;
  };
  progression?: EnrichmentPrescriptionStepV33;
  regression?: EnrichmentPrescriptionStepV33;
}

export interface EnrichmentMediaProvenanceV33 {
  origin?: string;
  author?: string;
  license?: string;
  usage_scope?: string;
}

export interface EnrichmentMediaItemV33 {
  id?: string;
  /** `image` | `video`. */
  type?: string;
  url?: string;
  order?: number;
  layout?: string | null;
  start_s?: number | null;
  end_s?: number | null;
  side_shown?: string | null;
  provenance?: EnrichmentMediaProvenanceV33;
}

export interface EnrichmentRelationV33 {
  /** np. `progression`, `regression`, `variant`, `alternative`, `preparatory`. */
  type?: string;
  key?: string | null;
  source_key?: string | null;
  difference?: string | null;
  when_to_switch?: string | null;
  order?: number;
  ai_suggested?: boolean;
  verified?: boolean;
}

export interface EnrichmentLifecycleV33 {
  availability?: string;
  status?: string;
  quality?: {
    auditor?: string;
    findings?: Array<{ code?: string; level?: string; path?: string; text?: string }>;
  };
}

export interface EnrichmentProvenanceV33 {
  sources?: Array<{ kind?: string; source_key?: string; role?: string }>;
  patient?: { by?: string; confidence?: number };
}

export interface ExerciseEnrichmentAiV3 {
  keywords?: string[];
  problems?: string[];
  suitable_for?: string[];
  contraindicated_for?: string[];
}

export interface ExerciseEnrichmentData {
  // Marker schemy v3 — obecny na wierszach już znormalizowanych przez backend (SPEC-022).
  $schema?: string;
  /** Wersja, do której rekord został doprowadzony, np. `"3.3"`. Brak = stary rekord. */
  schemaVersion?: string;
  /** v3.3: klucz ćwiczenia (`fx-NNNN`). */
  key?: string;
  /** v3.3: np. `exercise`. */
  kind?: string;
  classification?: EnrichmentClassificationV33;
  side?: EnrichmentSideV33;
  equipment_items?: EnrichmentEquipmentItemV33[];
  prescription?: EnrichmentPrescriptionV33;
  breathing?: EnrichmentBreathingV33;
  media?: EnrichmentMediaItemV33[];
  relations?: EnrichmentRelationV33[];
  lifecycle?: EnrichmentLifecycleV33;
  provenance?: EnrichmentProvenanceV33;
  patient?: ExerciseEnrichmentPatientV3;
  therapist?: ExerciseEnrichmentTherapistV3;
  ai?: ExerciseEnrichmentAiV3;
  /** Lista tekstów; w v3.3 wycofana na rzecz `equipment_items`. */
  equipment?: string[];
  simplified_instruction?: string;
  patient_notes?: {
    why_this_exercise?: string;
    technique_reminders?: string[];
    when_to_do?: string;
  };
  safety?: EnrichmentSafetyV33;
  feel_description?: {
    should_feel?: string;
    should_not_feel?: string;
  };
  common_mistakes?: EnrichmentCommonMistake[];
  dosing_profiles?: Record<string, EnrichmentDosingProfile>;
  therapist_notes?: {
    clinical_notes?: string;
    clinical_indications?: string[];
    contraindications?: string[];
    rehab_phase?: string[];
    coaching_cues?: EnrichmentCoachingCue[];
    clinical_benefits?: string[];
    progression_notes?: string;
  };
  patient_instruction?: {
    pre_exercise?: {
      quick_summary?: string;
      safety_note?: string;
      what_you_need?: string[];
      instruction_steps?: EnrichmentInstructionStep[];
      instruction_steps_simple?: EnrichmentInstructionStep[];
      instruction_steps_child?: EnrichmentInstructionStep[];
      instruction_steps_technical?: EnrichmentInstructionStep[];
    };
    during_exercise?: {
      phases?: EnrichmentPhase[];
    };
    post_exercise?: {
      completion_message?: string;
      feedback_questions?: EnrichmentFeedbackQuestion[];
      patient_note_prompt?: string;
    };
  };
  ai_metadata?: {
    search_keywords?: string[];
  };
}
