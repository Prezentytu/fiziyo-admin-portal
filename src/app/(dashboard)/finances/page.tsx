'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Wallet, Lock, BarChart3, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/shared/LoadingState';
import { AccessGuard } from '@/components/shared/AccessGuard';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  WalletCard,
  GamificationProgress,
  GrowthActionBar,
  StripeAlertBanner,
  StripeReturnHandler,
  EarningsChart,
  RevenueHistoryTable,
  PayoutScheduleCard,
  StripeConnectCard,
  PatientInviteDialog,
} from '@/components/finances';
import { GET_ORGANIZATION_EARNINGS_QUERY } from '@/graphql/queries';
import type { GetOrganizationEarningsResponse } from '@/types/apollo';

// ========================================
// Empty State Component (Blurred Teaser)
// ========================================

function EmptyStateTeaser({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-surface shadow-sm">
      {/* Blurred example chart */}
      <div className="absolute inset-0 blur-[6px] pointer-events-none opacity-30">
        <div className="h-full bg-surface-elevated/50 p-6">
          {/* Fake chart bars */}
          <div className="flex items-end gap-3 h-full px-2">
            {[30, 45, 25, 60, 80, 55, 70, 90, 65, 85, 95, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/40 rounded-t-sm"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm py-12 px-6">
        <div className="p-4 rounded-2xl bg-surface-elevated shadow-xl border border-border/50 mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-bold text-foreground mb-1.5">Odblokuj statystyki</p>
        <p className="text-sm text-muted-foreground mb-5 text-center max-w-sm">
          Zaproś pierwszego pacjenta Premium, aby zobaczyć i analizować swoje zarobki.
        </p>
        <Button onClick={onInvite} className="gap-2 px-6 font-semibold shadow-md shadow-primary/20">
          Zaproś teraz
        </Button>
      </div>
    </div>
  );
}

// ========================================
// Main Page Component
// ========================================

export default function FinancesPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch earnings to check if user has any data
  const { data: earningsData, loading: earningsLoading } = useQuery<GetOrganizationEarningsResponse>(
    GET_ORGANIZATION_EARNINGS_QUERY,
    {
      variables: { organizationId: organizationId || '' },
      skip: !organizationId,
      errorPolicy: 'all',
    }
  );

  const hasEarnings = (earningsData?.organizationEarnings?.totalEarnings || 0) > 0;
  const hasSubscribers = (earningsData?.organizationEarnings?.activeSubscribers || 0) > 0;

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      {/* Stripe Return Handler - obsługa powrotu z onboardingu */}
      <Suspense fallback={null}>
        <StripeReturnHandler organizationId={organizationId} />
      </Suspense>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Twoje Finanse</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Zarobki z subskrypcji pacjentów Premium</p>
          </div>
        </div>

        {/* Stripe Alert Banner (conditional) */}
        <StripeAlertBanner organizationId={organizationId} />

        {/* Hero Section - Grid 12 columns */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Wallet Card - 5/12 on desktop */}
          <div className="col-span-1 xl:col-span-5">
            <WalletCard organizationId={organizationId} />
          </div>

          {/* Gamification Progress - 7/12 on desktop */}
          <div className="col-span-1 xl:col-span-7">
            <GamificationProgress organizationId={organizationId} />
          </div>
        </div>

        {/* Growth Action Bar */}
        <GrowthActionBar organizationId={organizationId} />

        {/* Tabs Section */}
        <Tabs defaultValue="chart" className="w-full mt-2">
          <TabsList className="bg-surface border border-border/60 p-1 rounded-xl h-auto shadow-sm">
            <TabsTrigger
              value="chart"
              className="gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Wykres
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <History className="h-3.5 w-3.5" />
              Historia
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <Settings className="h-3.5 w-3.5" />
              Ustawienia Wypłat
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="mt-4">
            {earningsLoading ? (
              <Skeleton className="h-[350px] w-full bg-surface rounded-2xl border border-border/60" />
            ) : hasEarnings || hasSubscribers ? (
              <EarningsChart organizationId={organizationId} />
            ) : (
              <EmptyStateTeaser onInvite={() => setInviteDialogOpen(true)} />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {earningsLoading ? (
              <Skeleton className="h-[350px] w-full bg-surface rounded-2xl border border-border/60" />
            ) : hasEarnings || hasSubscribers ? (
              <RevenueHistoryTable organizationId={organizationId} />
            ) : (
              <EmptyStateTeaser onInvite={() => setInviteDialogOpen(true)} />
            )}
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PayoutScheduleCard organizationId={organizationId} />
              <StripeConnectCard organizationId={organizationId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <PatientInviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} organizationId={organizationId} />
    </AccessGuard>
  );
}
