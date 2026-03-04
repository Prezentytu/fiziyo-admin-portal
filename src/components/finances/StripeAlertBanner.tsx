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
  const [dismissed, setDismissed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);

  const {
    data: stripeData,
    loading: stripeLoading,
    refetch: refetchStripeStatus,
  } = useQuery<GetStripeConnectStatusResponse>(GET_STRIPE_CONNECT_STATUS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  const { data: billingData, loading: billingLoading, refetch: refetchBillingDetails } = useQuery<GetBillingDetailsResponse>(
    GET_BILLING_DETAILS_QUERY,
    {
      variables: { organizationId: organizationId || '' },
      skip: !organizationId,
      errorPolicy: 'all',
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
  const shouldShowBillingSetup = !isBillingConfigured;
  const shouldShowStripeSetup = isBillingConfigured && !isStripeConfigured;
  const shouldRenderBanner = shouldShowBillingSetup || shouldShowStripeSetup;

  if (stripeLoading || billingLoading || dismissed || !organizationId || !shouldRenderBanner) {
    return null;
  }

  const handleConfigure = () => {
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
  const icon = shouldShowBillingSetup ? <Building2 className="h-5 w-5 text-amber-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />;

  return (
    <>
      <div
        className={cn(
          'relative w-full flex items-center justify-between gap-3 px-4 py-3',
          'bg-amber-50 border border-amber-200/60 rounded-xl shadow-sm',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white shadow-sm border border-amber-100">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-amber-900">{bannerTitle}</p>
            <p className="text-xs text-amber-700">{bannerDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleConfigure}
            disabled={isLoading}
            size="sm"
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium"
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
            className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-100/70"
            data-testid="finance-alert-dismiss-btn"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BillingDetailsDialog
        open={isBillingDialogOpen}
        onOpenChange={setIsBillingDialogOpen}
        organizationId={organizationId}
        onSaved={() => {
          refetchBillingDetails();
          refetchStripeStatus();
        }}
      />
    </>
  );
}
