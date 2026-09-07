import type { Metadata } from 'next';
import { PayoutsPage } from '@/components/finances/PayoutsPage';

export const metadata: Metadata = { title: 'Historia Wypłat' };

export default function Page() {
  return <PayoutsPage />;
}
