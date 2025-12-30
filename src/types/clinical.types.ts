// Typy dla dokumentacji klinicznej

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
  rangeOfMotion?: Record<string, number>;
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

// Quick phrases dla szybkiego wprowadzania danych
export const QUICK_PHRASES = {
  mainComplaint: [
    'Ból dolnego odcinka kręgosłupa',
    'Ból kolana po urazie',
    'Ograniczenie ruchomości barku',
    'Ból głowy napięciowy',
    'Rehabilitacja pooperacyjna',
    'Ból szyi promieniujący do ramienia',
    'Zawroty głowy pochodzenia szyjnego',
    'Problemy z równowagą',
  ],
  painLocation: [
    'Odcinek lędźwiowy',
    'Odcinek szyjny',
    'Bark prawy',
    'Bark lewy',
    'Kolano prawe',
    'Kolano lewe',
    'Biodro prawe',
    'Biodro lewe',
    'Staw skokowy',
    'Nadgarstek',
    'Łokieć',
  ],
  painCharacter: [
    'Ostry',
    'Tępy',
    'Promieniujący',
    'Stały',
    'Okresowy',
    'Kłujący',
    'Palący',
    'Pulsujący',
  ],
  aggravatingFactors: [
    'Długotrwałe siedzenie',
    'Chodzenie po schodach',
    'Podnoszenie ciężarów',
    'Pozycja stojąca',
    'Ruchy rotacyjne',
    'Schylanie się',
    'Nocne godziny',
    'Aktywność fizyczna',
  ],
  relievingFactors: [
    'Odpoczynek',
    'Zmiana pozycji',
    'Ciepło',
    'Zimno',
    'Leki przeciwbólowe',
    'Ruch',
    'Masaż',
    'Stretching',
  ],
  interventions: [
    'Terapia manualna',
    'Masaż',
    'Ćwiczenia stabilizacyjne',
    'Stretching',
    'Mobilizacje stawowe',
    'Elektroterapia',
    'Ultradźwięki',
    'Kinesiotaping',
    'Ćwiczenia wzmacniające',
    'Edukacja pacjenta',
    'Trening propriocepcji',
    'Ćwiczenia oddechowe',
  ],
} as const;

// Typy wizyt z etykietami
export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  INITIAL: 'Pierwsza wizyta',
  FOLLOWUP: 'Wizyta kontrolna',
  DISCHARGE: 'Wizyta końcowa',
  CONSULTATION: 'Konsultacja',
};

// Statusy z etykietami
export const STATUS_LABELS: Record<ClinicalNoteStatus, string> = {
  DRAFT: 'Wersja robocza',
  COMPLETED: 'Zakończona',
  SIGNED: 'Podpisana',
};

