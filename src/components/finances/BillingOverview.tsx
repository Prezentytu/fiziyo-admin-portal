'use client';

import { useQuery } from '@apollo/client/react';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import type { CurrentBillingStatus, GetCurrentBillingStatusResponse } from '@/types/apollo';

export function getBillingMode(status: Pick<CurrentBillingStatus, 'isPilotMode' | 'pricePerPatient'>) {
  if (status.isPilotMode) return 'Darmowy pilotaż';
  if (status.pricePerPatient === 0) return 'Bez opłat za dostęp';
  return 'Rozliczenia płatne';
}

interface BillingOverviewContentProps {
  status?: CurrentBillingStatus | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

export function BillingOverviewContent({ status, loading, failed, onRetry }: BillingOverviewContentProps) {
  if (failed) {
    return <ErrorState testId="finances-billing-error" title="Nie udało się potwierdzić rozliczeń"
      description="Nie pokazujemy kwot ani trybu współpracy, dopóki nie uda się pobrać aktualnych danych."
      onRetry={onRetry} />;
  }
  if (loading) {
    return <div role="status" aria-label="Pobieranie rozliczeń" data-testid="finances-billing-loading">
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>;
  }
  if (!status) {
    return <ErrorState testId="finances-billing-empty" title="Brak danych o rozliczeniach"
      description="Brak danych nie oznacza zerowej należności. Odśwież widok; jeśli problem się utrzymuje, skontaktuj się z FiziYo."
      onRetry={onRetry} />;
  }
  const money = (value: number) => new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: status.currency,
  }).format(value);
  const period = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(
    new Date(status.year, status.month - 1, 1)
  );
  return (
    <section aria-labelledby="finances-billing-heading" className="rounded-xl border border-border bg-card p-6 space-y-6"
      data-testid="finances-billing-overview">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Bieżący tryb współpracy</p>
        <h2 id="finances-billing-heading" className="text-xl font-semibold text-foreground" data-testid="finances-billing-mode">
          {getBillingMode(status)}
        </h2>
        <p className="text-sm text-muted-foreground">Okres rozliczenia: {period}</p>
      </div>
      <dl className="grid gap-6 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Szacowana należność dla FiziYo</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-foreground" data-testid="finances-billing-amount">{money(status.estimatedTotal)}</dd>
        </div>
        <div><dt className="text-sm text-muted-foreground">Stawka za pacjenta w miesiącu</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-foreground" data-testid="finances-billing-rate">{money(status.pricePerPatient)}</dd>
        </div>
        <div><dt className="text-sm text-muted-foreground">Pacjenci z dostępem w tym miesiącu</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-foreground" data-testid="finances-billing-patients">{status.activePatientsInMonth}</dd>
        </div>
      </dl>
      <div className="space-y-2 text-sm text-muted-foreground" data-testid="finances-billing-rules">
        <p>Kwota pochodzi z bieżącego rozliczenia FiziYo i może zmienić się do końca miesiąca. To szacunek, a nie faktura ani potwierdzenie pobrania pieniędzy.</p>
        <p>Obecne naliczanie uwzględnia pacjentów, którzy mieli dostęp w tym miesiącu. Aktywny dostęp nie potwierdza zapłaty pacjenta gabinetowi.</p>
        <p>Zmianę warunków lub zakończenie pilotażu uzgodnij z zespołem FiziYo. Ten ekran nie uruchamia płatności.</p>
      </div>
    </section>
  );
}

export function BillingOverview({ organizationId }: { organizationId: string }) {
  const { data, loading, error, refetch } = useQuery<GetCurrentBillingStatusResponse>(GET_CURRENT_BILLING_STATUS_QUERY, {
    variables: { organizationId },
    fetchPolicy: 'network-only',
    errorPolicy: 'none',
    notifyOnNetworkStatusChange: true,
  });
  return <BillingOverviewContent status={data?.currentBillingStatus} loading={loading} failed={Boolean(error)}
    onRetry={() => { void refetch().catch(() => undefined); }} />;
}
