"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Wallet, Lock, BarChart3, History, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/LoadingState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import { useOrganization } from "@/contexts/OrganizationContext";
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
} from "@/components/finances";
import { GET_ORGANIZATION_EARNINGS_QUERY } from "@/graphql/queries";
import type { GetOrganizationEarningsResponse } from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Empty State Component (Blurred Teaser)
// ========================================

function EmptyStateTeaser({
  onInvite,
}: {
  onInvite: () => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred example chart */}
      <div className="blur-sm pointer-events-none opacity-40">
        <div className="h-64 bg-zinc-900/50 rounded-xl p-6">
          {/* Fake chart bars */}
          <div className="flex items-end gap-2 h-full">
            {[30, 45, 25, 60, 80, 55, 70, 90, 65, 85, 95, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Overlay with lock */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 rounded-xl backdrop-blur-[2px]">
        <div className="p-4 rounded-full bg-zinc-800/80 mb-4">
          <Lock className="h-10 w-10 text-zinc-500" />
        </div>
        <p className="text-lg font-medium text-white mb-1">
          Odblokuj statystyki
        </p>
        <p className="text-sm text-zinc-400 mb-4 text-center max-w-xs">
          Zaproś pierwszego pacjenta Premium, aby zobaczyć swoje zarobki
        </p>
        <Button
          onClick={onInvite}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600"
        >
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
  const { data: earningsData, loading: earningsLoading } =
    useQuery<GetOrganizationEarningsResponse>(GET_ORGANIZATION_EARNINGS_QUERY, {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    });

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

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Twoje Finanse</h1>
            <p className="text-sm text-zinc-400">
              Zarobki z subskrypcji pacjentów Premium
            </p>
          </div>
        </div>

        {/* Stripe Alert Banner (conditional) */}
        <StripeAlertBanner organizationId={organizationId} />

        {/* Hero Section - Grid 12 columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Wallet Card - 5/12 on desktop */}
          <div className="col-span-1 md:col-span-5">
            <WalletCard organizationId={organizationId} />
          </div>

          {/* Gamification Progress - 7/12 on desktop */}
          <div className="col-span-1 md:col-span-7">
            <GamificationProgress organizationId={organizationId} />
          </div>
        </div>

        {/* Growth Action Bar */}
        <GrowthActionBar organizationId={organizationId} />

        {/* Tabs Section */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-white/5 p-1">
            <TabsTrigger
              value="chart"
              className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <BarChart3 className="h-4 w-4" />
              Wykres
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <History className="h-4 w-4" />
              Historia
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <Settings className="h-4 w-4" />
              Ustawienia Wypłat
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="mt-6">
            {earningsLoading ? (
              <Skeleton className="h-64 w-full bg-zinc-800" />
            ) : hasEarnings || hasSubscribers ? (
              <EarningsChart organizationId={organizationId} />
            ) : (
              <EmptyStateTeaser onInvite={() => setInviteDialogOpen(true)} />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {earningsLoading ? (
              <Skeleton className="h-64 w-full bg-zinc-800" />
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
      <PatientInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organizationId={organizationId}
      />
    </AccessGuard>
  );
}
