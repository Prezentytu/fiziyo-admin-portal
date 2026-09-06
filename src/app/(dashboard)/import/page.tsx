import type { Metadata } from 'next';
import { ImportPage } from '@/features/import/ImportPage';

export const metadata: Metadata = { title: 'Import dokumentów' };

export default function Page() {
  return <ImportPage />;
}
