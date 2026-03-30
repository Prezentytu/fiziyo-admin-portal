'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { AlertTriangle, ArrowRight, Building2, Loader2, X, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const bannerTitle = shouldShowBillingSetup ? 'Uzupełnij dane rozliczeniowe' : 'Połącz konto do wypłat';
  const bannerDescription = shouldShowBillingSetup
    ? 'Wymagane do faktur i wypłat.'
    : 'Wymagane do automatycznych wypłat.';
  const bannerStepLabel = shouldShowBillingSetup ? 'Krok 1 z 2: dane do faktury' : 'Krok 2 z 2: wypłaty Stripe';
  const icon = shouldShowBillingSetup ? (
    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  );

  return (
    <>
      <TooltipProvider>
        <div
        className={cn(
          'relative w-full flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm transition-all',
          'md:p-5',
          className
        )}
        data-testid="finance-alert-banner"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 p-2.5 rounded-xl shadow-sm border border-amber-200/50 bg-amber-500/10 dark:bg-amber-900/20 dark:border-amber-800/30">
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground" data-testid="finance-alert-step-label">
              {bannerStepLabel}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-foreground">{bannerTitle}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    data-testid="finance-alert-info-btn"
                    aria-label="Szczegóły kroku konfiguracji"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {shouldShowBillingSetup
                    ? 'Uzupełniasz dane firmy, które są potrzebne do poprawnych dokumentów i przygotowania wypłat.'
                    : 'Łączysz konto Stripe, aby środki mogły być wypłacane na konto bankowe.'}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">{bannerDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Button
            onClick={handleConfigure}
            disabled={isLoading}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
            data-testid="finance-alert-dismiss-btn"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        </div>
      </TooltipProvider>

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
