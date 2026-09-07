import type { Metadata } from 'next';
import { InvoicesPage } from '@/components/finances/InvoicesPage';

export const metadata: Metadata = { title: 'Faktury i Rozliczenia' };

export default function Page() {
  return <InvoicesPage />;
}
