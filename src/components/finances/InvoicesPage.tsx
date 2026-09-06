'use client';

import { LoadingState } from '@/components/shared/LoadingState';
import { AccessGuard } from '@/components/shared/AccessGuard';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageShell } from '@/components/shared/page/PageShell';
import { useOrganization } from '@/contexts/OrganizationContext';
import { BillingHeroCard, TherapistBillingTable, BillingDetailsCard, InvoicesHistoryCard } from '@/components/billing';

// ========================================
// Invoices Page - Faktury B2B (za korzystanie z systemu)
// ========================================

export function InvoicesPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  if (orgLoading) {
    return (
      <PageShell>
        <PageHeader title="Faktury i rozliczenia" />
        <LoadingState type="text" count={3} />
      </PageShell>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <PageShell>
        <PageHeader
          title="Faktury i rozliczenia"
          description="Opłaty za korzystanie z systemu FiziYo"
          backHref="/finances"
          titleTestId="finances-invoices-title"
        />

        {/* Billing Hero - należności */}
        <BillingHeroCard organizationId={organizationId} />

        {/* Main Grid - 2/3 + 1/3 layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <TherapistBillingTable organizationId={organizationId} />
          </div>

          {/* Sidebar Column - 1/3 */}
          <div className="space-y-4">
            <BillingDetailsCard organizationId={organizationId} />
            <InvoicesHistoryCard organizationId={organizationId} />
          </div>
        </div>
      </PageShell>
    </AccessGuard>
  );
}
