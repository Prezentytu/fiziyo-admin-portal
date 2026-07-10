// Typy dla dokumentacji

export type VisitType = 'INITIAL' | 'FOLLOWUP' | 'DISCHARGE' | 'CONSULTATION';
export type ClinicalNoteStatus = 'DRAFT' | 'COMPLETED' | 'SIGNED';

export interface ClinicalNote {
  id: string;
  patientId: string;
  therapistId: string;
  organizationId: string;
  therapistPatientAssignmentId?: string;
  visitDate: string;
  visitType: VisitType;
  templateId?: string;
  status: ClinicalNoteStatus;
  sections?: ClinicalNoteSections;
  linkedExerciseSetId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signedById?: string;
  // Relacje
  patient?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  };
  therapist?: {
    id: string;
    fullname?: string;
    email?: string;
  };
  linkedExerciseSet?: {
    id: string;
    name: string;
  };
}

export interface ClinicalNoteSections {
  interview?: InterviewSection;
  examination?: ExaminationSection;
  diagnosis?: DiagnosisSection;
  treatmentPlan?: TreatmentPlanSection;
  visitProgress?: VisitProgressSection;
}

export interface InterviewSection {
  mainComplaint?: string;
  painLocation?: string[];
  painDuration?: string;
  painCharacter?: string[];
  painIntensity?: number;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  previousTreatment?: string;
  comorbidities?: string;
  medications?: string;
  occupation?: string;
  additionalNotes?: string;
}

export interface ExaminationSection {
  posture?: string;
  rangeOfMotion?: RangeOfMotionEntry[];
  specialTests?: SpecialTest[];
  muscleStrength?: string;
  palpation?: string;
  sensation?: string;
  observations?: string;
  additionalNotes?: string;
}

export interface SpecialTest {
  name?: string;
  result?: 'positive' | 'negative' | 'inconclusive';
  notes?: string;
}

export interface RangeOfMotionEntry {
  movement?: string;
  value?: number;
  side?: 'left' | 'right' | 'bilateral';
}

export interface DiagnosisSection {
  icd10Codes?: ICD10Code[];
  icfCodes?: ICFCode[];
  differentialDiagnosis?: string;
  clinicalReasoning?: string;
}

export interface ICD10Code {
  code: string;
  description: string;
  isPrimary: boolean;
}

export interface ICFCode {
  code: string;
  description: string;
  category?: 'bodyFunction' | 'bodyStructure' | 'activity' | 'participation' | 'environment';
}

export interface TreatmentPlanSection {
  shortTermGoals?: string;
  longTermGoals?: string;
  interventions?: string[];
  visitFrequency?: string;
  expectedDuration?: string;
  homeRecommendations?: string;
  additionalNotes?: string;
}

export interface VisitProgressSection {
  techniques?: string;
  patientResponse?: string;
  planModifications?: string;
  homeRecommendations?: string;
  currentPainLevel?: number;
  progressComparison?: string;
  nextSteps?: string;
}

// Input types dla mutacji
export interface ClinicalNoteSectionsInput {
  interview?: InterviewSection;
  examination?: ExaminationSection;
  diagnosis?: DiagnosisSection;
  treatmentPlan?: TreatmentPlanSection;
  visitProgress?: VisitProgressSection;
}

export interface CreateClinicalNoteInput {
  patientId: string;
  organizationId: string;
  visitType: VisitType;
  visitDate: string;
  title?: string;
  templateId?: string;
  therapistPatientAssignmentId?: string;
  sections?: ClinicalNoteSectionsInput;
}

export interface UpdateClinicalNoteInput {
  id: string;
  visitType?: VisitType;
  visitDate?: string;
  title?: string;
  status?: ClinicalNoteStatus;
  linkedExerciseSetId?: string;
  sections?: ClinicalNoteSectionsInput;
}

