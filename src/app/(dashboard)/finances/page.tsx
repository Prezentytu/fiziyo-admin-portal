import type { Metadata } from 'next';
import { FinancesPage } from '@/components/finances/FinancesPage';

export const metadata: Metadata = { title: 'Finanse' };

export default function Page() {
  return <FinancesPage />;
}
