import type { Metadata } from 'next';
import { PatientDetailPage } from '@/features/patients/PatientDetailPage';

export const metadata: Metadata = { title: 'Pacjent' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <PatientDetailPage {...props} />;
}
