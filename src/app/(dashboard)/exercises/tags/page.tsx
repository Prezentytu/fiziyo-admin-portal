import type { Metadata } from 'next';
import { TagsPage } from '@/features/exercises/TagsPage';

export const metadata: Metadata = { title: 'Tagi i kategorie' };

export default function Page() {
  return <TagsPage />;
}
