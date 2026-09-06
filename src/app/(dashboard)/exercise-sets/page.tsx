import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExerciseSetsPage } from '@/features/exercise-sets/ExerciseSetsPage';

export const metadata: Metadata = { title: 'Zestawy' };

export default function Page() {
  return (
    <Suspense>
      <ExerciseSetsPage />
    </Suspense>
  );
}
