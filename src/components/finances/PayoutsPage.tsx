'use client';

import { useQuery } from '@apollo/client/react';
import { ArrowUpRight, Calendar, Wallet, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/shared/LoadingState';
import { AccessGuard } from '@/components/shared/AccessGuard';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageShell } from '@/components/shared/page/PageShell';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_STRIPE_CONNECT_STATUS_QUERY, GET_REVENUE_HISTORY_QUERY } from '@/graphql/queries';
import type { GetStripeConnectStatusResponse, GetRevenueHistoryResponse } from '@/types/apollo';
import { formatCurrency } from '@/types/revenue.types';
import { cn } from '@/lib/utils';

// ========================================
// Payouts Page - Historia wypłat ze Stripe
// ========================================

export function PayoutsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  // Stripe Connect Status
  const { data: stripeData, loading: stripeLoading } = useQuery<GetStripeConnectStatusResponse>(
    GET_STRIPE_CONNECT_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || '' },
      skip: !organizationId,
      errorPolicy: 'all',
    }
  );

  // Payout transactions
  const { data: historyData, loading: historyLoading } = useQuery<GetRevenueHistoryResponse>(
    GET_REVENUE_HISTORY_QUERY,
    {
      variables: {
        organizationId: organizationId || '',
        type: 'Payout',
        limit: 50,
      },
      skip: !organizationId,
      errorPolicy: 'all',
    }
  );

  const stripeStatus = stripeData?.stripeConnectStatus;
  const payouts = historyData?.revenueHistory || [];

  if (orgLoading) {
    return (
      <PageShell>
        <PageHeader title="Historia wypłat" />
        <LoadingState type="text" count={3} />
      </PageShell>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <PageShell>
        <PageHeader
          title="Historia wypłat"
          description="Przelewy ze Stripe Connect na Twoje konto bankowe"
          backHref="/finances"
          titleTestId="finances-payouts-title"
        />

        {/* Balance Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Available Balance */}
          <Card className="border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Dostępne do wypłaty</span>
              </div>
              {stripeLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {formatCurrency(stripeStatus?.availableBalance || 0)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending Balance */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm text-muted-foreground">Oczekujące</span>
              </div>
              {stripeLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {formatCurrency(stripeStatus?.pendingBalance || 0)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stripe Status */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Status konta</span>
              </div>
              {stripeLoading && <Skeleton className="h-6 w-24" />}
              {!stripeLoading && stripeStatus?.payoutsEnabled && (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Wypłaty aktywne
                </Badge>
              )}
              {!stripeLoading && !stripeStatus?.payoutsEnabled && (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Wymaga konfiguracji
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payouts History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              Historia przelewów
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            {!historyLoading && payouts.length === 0 && (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Brak wypłat</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Gdy zaczniesz otrzymywać prowizje od subskrypcji pacjentów, tutaj pojawi się historia przelewów.
                </p>
              </div>
            )}
            {!historyLoading && payouts.length > 0 && (
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/60 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          payout.status === 'completed' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                        )}
                      >
                        {payout.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{payout.description || 'Przelew na konto'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(payout.createdAt).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-500 tabular-nums">
                        +{formatCurrency(payout.netAmount, payout.currency)}
                      </p>
                      <Badge variant={payout.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {payout.status === 'completed' ? 'Zrealizowany' : 'W trakcie'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </AccessGuard>
  );
}
