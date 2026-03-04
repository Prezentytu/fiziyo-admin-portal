'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { AlertTriangle, ArrowRight, Building2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GET_BILLING_DETAILS_QUERY, GET_STRIPE_CONNECT_STATUS_QUERY } from '@/graphql/queries';
import { INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION } from '@/graphql/mutations';
import type {
  GetBillingDetailsResponse,
  GetStripeConnectStatusResponse,
  InitiateStripeConnectOnboardingResponse,
} from '@/types/apollo';
import { cn } from '@/lib/utils';
import { BillingDetailsDialog } from '@/components/billing';
import { isFeatureEnabled } from '@/lib/featureFlags';

// ========================================
// Types
// ========================================

interface StripeAlertBannerProps {
  readonly organizationId?: string;
  readonly className?: string;
}

// ========================================
// Component
// ========================================

export function StripeAlertBanner({ organizationId, className }: Readonly<StripeAlertBannerProps>) {
  const isBillingDetailsApiEnabled = isFeatureEnabled('BILLING_DETAILS_API');
  const isStripeConnectEnabled = isFeatureEnabled('STRIPE_CONNECT_ROLLOUT');
  const [dismissed, setDismissed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);

  const {
    data: stripeData,
    loading: stripeLoading,
    refetch: refetchStripeStatus,
  } = useQuery<GetStripeConnectStatusResponse>(GET_STRIPE_CONNECT_STATUS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId || !isStripeConnectEnabled,
    errorPolicy: 'all',
  });

  const { data: billingData, loading: billingLoading, refetch: refetchBillingDetails } = useQuery<GetBillingDetailsResponse>(
    GET_BILLING_DETAILS_QUERY,
    {
      variables: { organizationId: organizationId || '' },
      skip: !organizationId || !isBillingDetailsApiEnabled,
      errorPolicy: 'ignore', // zmiana na ignore, zeby brak pola na backendzie nie wysypywal UI
      fetchPolicy: 'cache-and-network',
    }
  );

  // Initiate onboarding mutation
  const [initiateOnboarding, { loading: onboardingLoading }] = useMutation<InitiateStripeConnectOnboardingResponse>(
    INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION,
    {
      onCompleted: (data) => {
        if (data.initiateStripeConnectOnboarding.success) {
          const url = data.initiateStripeConnectOnboarding.onboardingUrl;
          if (url) {
            setIsRedirecting(true);
            toast.success('Przekierowuję do Stripe...');
            globalThis.location.href = url;
          }
        } else {
          toast.error(data.initiateStripeConnectOnboarding.message || 'Nie udało się rozpocząć konfiguracji');
        }
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const stripeStatus = stripeData?.stripeConnectStatus;
  const isBillingConfigured = Boolean(billingData?.billingDetails?.isComplete);
  const isStripeConfigured = Boolean(stripeStatus?.onboardingComplete && stripeStatus?.payoutsEnabled);
  const isManualBillingMode = !isStripeConnectEnabled;
  const shouldShowBillingSetup = isManualBillingMode || (isBillingDetailsApiEnabled && !isBillingConfigured);
  const shouldShowStripeSetup = !isManualBillingMode && isBillingDetailsApiEnabled && isBillingConfigured && !isStripeConfigured;
  const shouldRenderBanner = shouldShowBillingSetup || shouldShowStripeSetup;

  if (
    (isStripeConnectEnabled && stripeLoading) ||
    (isBillingDetailsApiEnabled && billingLoading) ||
    dismissed ||
    !organizationId ||
    !shouldRenderBanner
  ) {
    return null;
  }

  const handleConfigure = () => {
    if (isManualBillingMode) {
      setIsBillingDialogOpen(true);
      return;
    }

    if (shouldShowBillingSetup) {
      setIsBillingDialogOpen(true);
      return;
    }

    initiateOnboarding({ variables: { organizationId } });
  };

  const isLoading = shouldShowStripeSetup && (onboardingLoading || isRedirecting);
  const bannerTitle = shouldShowBillingSetup ? 'Dokończ konfigurację rozliczeń' : 'Dokończ konfigurację wypłat';
  const bannerDescription = shouldShowBillingSetup
    ? 'Podaj dane firmy (NIP, konto bankowe), abyśmy mogli wystawiać faktury.'
    : 'Połącz konto bankowe przez Stripe, aby otrzymywać wypłaty.';
  const icon = shouldShowBillingSetup ? (
    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  );

  return (
    <>
      <div
        className={cn(
          'relative w-full flex items-center justify-between gap-3 px-4 py-3',
          'rounded-xl border shadow-sm transition-all',
          'bg-surface-elevated border-border',
          'dark:bg-surface-elevated dark:border-border',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg shadow-sm border border-amber-100/50 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800/30">
            {icon}
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{bannerTitle}</p>
            <p className="text-sm font-medium text-foreground/80 mt-0.5">{bannerDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleConfigure}
            disabled={isLoading}
            size="sm"
            className="gap-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 shadow-sm"
            data-testid="finance-alert-configure-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRedirecting ? 'Przekierowuję...' : 'Ładuję...'}
              </>
            ) : (
              <>
                Dokończ konfigurację
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800/50"
            data-testid="finance-alert-dismiss-btn"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isBillingDetailsApiEnabled && (
        <BillingDetailsDialog
          open={isBillingDialogOpen}
          onOpenChange={setIsBillingDialogOpen}
          organizationId={organizationId}
          onSaved={() => {
            refetchBillingDetails();
            refetchStripeStatus();
          }}
        />
      )}
    </>
  );
}
