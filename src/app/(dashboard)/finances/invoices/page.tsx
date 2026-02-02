"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  BillingHeroCard,
  TherapistBillingTable,
  FairUsageCard,
  BillingDetailsCard,
  InvoicesHistoryCard,
} from "@/components/billing";

// ========================================
// Invoices Page - Faktury B2B (za korzystanie z systemu)
// ========================================

export default function InvoicesPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Faktury i Rozliczenia
          </h1>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/finances">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Faktury i Rozliczenia
              </h1>
              <p className="text-sm text-muted-foreground">
                Opłaty za korzystanie z systemu FiziYo
              </p>
            </div>
          </div>
        </div>

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
            <FairUsageCard organizationId={organizationId} />
            <BillingDetailsCard organizationId={organizationId} />
            <InvoicesHistoryCard organizationId={organizationId} />
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
