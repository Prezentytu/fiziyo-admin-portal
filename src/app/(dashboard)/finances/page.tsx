'use client';

import { LoadingState } from '@/components/shared/LoadingState';
import { AccessGuard } from '@/components/shared/AccessGuard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { BillingHeroCard, TherapistBillingTable, BillingDetailsCard } from '@/components/billing';
import { PageSheet } from '@/components/shared/page';

// ========================================
// Finances Page - rozliczenie gabinetu z FiziYo (faktura poza aplikacją)
// ========================================

function FinancesHeader() {
  return (
    <div>
      <h1 className="text-[28px] font-bold leading-[34px] tracking-tight text-foreground">Finanse</h1>
      <p className="mt-1 text-[15px] text-label-secondary">
        Ile płacisz za FiziYo w tym miesiącu. Rozliczamy się fakturą, poza aplikacją.
      </p>
    </div>
  );
}

export default function FinancesPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <FinancesHeader />
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <PageSheet contentClassName="gap-6" data-testid="finances-billing-page">
        <FinancesHeader />

        {/* Należność za bieżący miesiąc */}
        <BillingHeroCard organizationId={organizationId} />

        {/* Main Grid - 2/3 + 1/3 layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <TherapistBillingTable organizationId={organizationId} />
          </div>

          {/* Dane, na które wystawiamy fakturę */}
          <div className="space-y-4">
            <BillingDetailsCard organizationId={organizationId} />
          </div>
        </div>
      </PageSheet>
    </AccessGuard>
  );
}
