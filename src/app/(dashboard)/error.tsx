'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Nie udało się wczytać strony"
      description={error.message || 'Spróbuj odświeżyć ten widok.'}
      onRetry={reset}
      testId="dashboard-route-error"
    />
  );
}
