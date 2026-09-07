'use client';

import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageShell } from '@/components/shared/page/PageShell';
import { ErrorState } from '@/components/shared/ErrorState';
import type { VerificationQueueAdapter } from './adapters';

interface VerificationDetailProps {
  adapter: VerificationQueueAdapter;
  title: string;
  backHref: string;
  error?: Error | null;
  onRetry?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function VerificationDetail({
  adapter,
  title,
  backHref,
  error,
  onRetry,
  actions,
  children,
}: VerificationDetailProps) {
  if (error) {
    return (
      <PageShell>
        <ErrorState title={`Nie udało się wczytać: ${adapter.title}`} description={error.message} onRetry={onRetry} />
      </PageShell>
    );
  }

  return (
    <PageShell variant="fullBleed">
      <div className="space-y-4 p-4 lg:p-6">
        <PageHeader title={title} backHref={backHref} actions={actions} titleTestId="verification-detail-title" />
        {children}
      </div>
    </PageShell>
  );
}
