// Rejestracja fontów (automatyczna przy imporcie)
import './registerFonts';

// Komponenty PDF
export { ExerciseSetPDF } from './ExerciseSetPDF';
export { PDFHeader } from './PDFHeader';
export { PDFFooter } from './PDFFooter';
export { PDFFrequency } from './PDFFrequency';
export { ExercisePDFItem } from './ExercisePDFItem';

// Style
export { pdfStyles } from './styles';

// Funkcje pomocnicze (polska odmiana)
export {
  formatSets,
  formatReps,
  formatSeconds,
  formatDurationPolish,
  formatExercises,
  formatTimes,
  formatDaysPolish,
  translateExerciseTypePolish,
  translateExerciseTypeShort,
  translateExerciseSidePolish,
} from './polishUtils';

// Typy
export type {
  PDFExercise,
  PDFFrequency as PDFFrequencyType,
  PDFExerciseSet,
  PDFOrganization,
  PDFPatient,
  PDFTherapist,
  PDFOptions,
  ExerciseSetPDFProps,
} from './types';
