import { loadPdfRenderer } from './loadPdfRenderer';
import { preloadPdfExerciseImages, toPdfExercises, type PdfMappingSource } from './pdfExerciseUtils';
import type { PDFFrequency, PDFOrganization } from './types';
import type { Organization } from '@/types/apollo';

type OrganizationSource = Pick<Organization, 'name' | 'logoUrl' | 'address' | 'contactPhone' | 'contactEmail' | 'website'>;

export function toPdfOrganization(organization: OrganizationSource): PDFOrganization {
  return {
    name: organization.name || 'Gabinet Fizjoterapii',
    logoUrl: organization.logoUrl,
    address: organization.address,
    phone: organization.contactPhone,
    email: organization.contactEmail,
    website: organization.website,
  };
}

export interface PatientCardPdfInput {
  organization: OrganizationSource;
  patient: { name: string; email?: string };
  therapistName?: string;
  plan: {
    id: string;
    name: string;
    description?: string;
    exerciseMappings?: PdfMappingSource[] | null;
    /** `exerciseOverrides` przypisania: personalizacja i ukrycie po id mappingów. */
    exerciseOverrides?: string | null;
    frequency?: PDFFrequency;
    startDate?: string;
    endDate?: string;
  };
  qrCodeDataUrl?: string;
  joinUrl?: string;
}

export function patientCardFileName(planName: string, patientName: string): string {
  const safeName = planName
    .replaceAll(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')
    .replaceAll(/\s+/g, '_')
    .substring(0, 50);
  return `Karta_Pacjenta_${safeName}_${patientName.split(' ')[0]}.pdf`;
}

/** Karta pacjenta (plan z personalizacją przypisania i kod QR) dla dialogu dostępu i karty sukcesu kreatora. */
export async function buildPatientCardPdf({
  organization,
  patient,
  therapistName,
  plan,
  qrCodeDataUrl,
  joinUrl,
}: PatientCardPdfInput): Promise<{ blob: Blob; fileName: string }> {
  const exercises = toPdfExercises(plan.exerciseMappings, plan.exerciseOverrides);
  await preloadPdfExerciseImages(exercises);

  const { pdf, ExerciseSetPDF } = await loadPdfRenderer();
  const blob = await pdf(
    <ExerciseSetPDF
      exerciseSet={{
        id: plan.id,
        name: plan.name,
        description: plan.description,
        exercises,
        frequency: plan.frequency,
        startDate: plan.startDate,
        endDate: plan.endDate,
      }}
      organization={toPdfOrganization(organization)}
      patient={{ name: patient.name, email: patient.email }}
      therapist={therapistName ? { name: therapistName } : undefined}
      options={{ showImages: true, showFrequency: !!plan.frequency, showQRCode: true, compactMode: false }}
      qrCodeDataUrl={qrCodeDataUrl}
      joinUrl={joinUrl}
    />
  ).toBlob();

  return { blob, fileName: patientCardFileName(plan.name, patient.name) };
}
