'use client';

import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageShell } from '@/components/shared/page/PageShell';
import { ShieldCheck } from 'lucide-react';
import type { VerificationQueueAdapter } from './adapters';

interface VerificationQueueProps {
  adapter: VerificationQueueAdapter;
  search: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function VerificationQueue({
  adapter,
  search,
  onSearchChange,
  loading,
  error,
  onRetry,
  isEmpty,
  actions,
  children,
}: VerificationQueueProps) {
  return (
    <PageShell>
      <PageHeader
        title={adapter.title}
        description={adapter.description}
        titleTestId="verification-page-title"
        actions={
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Szukaj ćwiczeń..."
              aria-label="Szukaj w kolejce weryfikacji"
              testId="verification-search-input"
            />
            {actions}
          </div>
        }
      />
      {error ? <ErrorState onRetry={onRetry} description={error.message} /> : null}
      {!error && loading ? <ListSkeleton variant="cards" /> : null}
      {!error && !loading && isEmpty ? (
        <EmptyState
          icon={ShieldCheck}
          title="Brak pozycji w kolejce"
          description="Nie ma ćwiczeń spełniających wybrane filtry."
        />
      ) : null}
      {!error && !loading && !isEmpty ? children : null}
    </PageShell>
  );
}
