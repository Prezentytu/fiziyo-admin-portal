import { z } from 'zod';

export const REPORT_REASON_CATEGORIES = [
  'WRONG_DESCRIPTION',
  'WRONG_MEDIA',
  'CLINICAL_RISK',
  'DUPLICATE',
  'OUTDATED_CONTENT',
  'NEEDS_IMPROVEMENT',
  'OTHER',
] as const;

export const reportExerciseSchema = z.object({
  reasonCategory: z.enum(REPORT_REASON_CATEGORIES),
  description: z.string().trim().min(1, 'Napisz, co poprawić').max(2000, 'Opis jest za długi'),
});

export type ReportExerciseFormValues = z.infer<typeof reportExerciseSchema>;
