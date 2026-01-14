// Typy dla generowania PDF

export interface PDFExercise {
  id: string;
  name: string;
  description?: string;
  type?: 'reps' | 'time';
  exerciseSide?: 'left' | 'right' | 'alternating' | 'both' | 'none';
  imageUrl?: string;
  images?: string[];
  notes?: string;
  // Parametry z mappingu (nadpisują exercise)
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  order?: number;
  customName?: string;
  customDescription?: string;
}

export interface PDFFrequency {
  timesPerDay?: number;
  timesPerWeek?: number;
  breakBetweenSets?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

export interface PDFExerciseSet {
  id: string;
  name: string;
  description?: string;
  exercises: PDFExercise[];
  frequency?: PDFFrequency;
}

export interface PDFOrganization {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface PDFPatient {
  name: string;
  email?: string;
}

export interface PDFTherapist {
  name: string;
}

export interface PDFOptions {
  showImages: boolean;
  showFrequency: boolean;
  showQRCode: boolean;
  compactMode: boolean;
  notes?: string;
}

export interface ExerciseSetPDFProps {
  exerciseSet: PDFExerciseSet;
  organization: PDFOrganization;
  patient?: PDFPatient;
  therapist?: PDFTherapist;
  options: PDFOptions;
  qrCodeDataUrl?: string;
}


