import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExerciseSetDetailPage } from '@/features/exercise-sets/ExerciseSetDetailPage';

export const metadata: Metadata = { title: 'Zestaw' };

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <ExerciseSetDetailPage {...props} />
    </Suspense>
  );
}
