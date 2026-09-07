import type { Metadata } from 'next';
import { ExerciseDetailPage } from '@/features/exercises/ExerciseDetailPage';

export const metadata: Metadata = { title: 'Ćwiczenie' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <ExerciseDetailPage {...props} />;
}
