import type { Metadata } from 'next';
import { ExercisesPage } from '@/features/exercises/ExercisesPage';

export const metadata: Metadata = { title: 'Ćwiczenia' };

export default function Page() {
  return <ExercisesPage />;
}
