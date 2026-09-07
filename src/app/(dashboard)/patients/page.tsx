import type { Metadata } from 'next';
import { PatientsPage } from '@/features/patients/PatientsPage';

export const metadata: Metadata = { title: 'Pacjenci' };

export default function Page() {
  return <PatientsPage />;
}
