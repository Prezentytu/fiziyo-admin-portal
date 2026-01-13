"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import {
  BillingHeroCard,
  TherapistBillingTable,
  FairUsageCard,
  BillingDetailsCard,
  InvoicesHistoryCard,
} from "@/components/billing";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function BillingPage() {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Rozliczenia</h1>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Rozliczenia</h1>
          <p className="text-sm text-muted-foreground">
            Centrum finansowe Twojej organizacji
          </p>
        </div>

        {/* Hero Section - Full Width */}
        <BillingHeroCard organizationId={organizationId} />

        {/* Main Grid - 2/3 + 1/3 layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column - 2/3 (Efficiency & Analysis) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Efficiency Table */}
            <TherapistBillingTable organizationId={organizationId} />
          </div>

          {/* Sidebar Column - 1/3 (Logistics) */}
          <div className="space-y-4">
            {/* AI Fair Usage Status */}
            <FairUsageCard organizationId={organizationId} />

            {/* Billing Details (Company info) */}
            <BillingDetailsCard organizationId={organizationId} />

            {/* Invoices History */}
            <InvoicesHistoryCard organizationId={organizationId} />
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
