'use client';

import { Suspense } from 'react';

import { NameReviewPage } from '@/features/exercise-names/NameReviewPage';

export default function ExerciseNameReviewRoute() {
  return (
    <Suspense>
      <NameReviewPage />
    </Suspense>
  );
}
