"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GET_STRIPE_CONNECT_STATUS_QUERY } from "@/graphql/queries";
import { INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION } from "@/graphql/mutations";
import type {
  GetStripeConnectStatusResponse,
  InitiateStripeConnectOnboardingResponse,
} from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface StripeAlertBannerProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function StripeAlertBanner({
  organizationId,
  className,
}: StripeAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch Stripe Connect status
  const { data, loading } = useQuery<GetStripeConnectStatusResponse>(
    GET_STRIPE_CONNECT_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  // Initiate onboarding mutation
  const [initiateOnboarding, { loading: onboardingLoading }] =
    useMutation<InitiateStripeConnectOnboardingResponse>(
      INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION,
      {
        onCompleted: (data) => {
          if (data.initiateStripeConnectOnboarding.success) {
            const url = data.initiateStripeConnectOnboarding.onboardingUrl;
            if (url) {
              setIsRedirecting(true);
              toast.success("Przekierowuję do Stripe...");
              window.location.href = url;
            }
          } else {
            toast.error(
              data.initiateStripeConnectOnboarding.message ||
                "Nie udało się rozpocząć konfiguracji"
            );
          }
        },
        onError: (error) => {
          toast.error(`Błąd: ${error.message}`);
        },
      }
    );

  const status = data?.stripeConnectStatus;

  // Don't show if:
  // - Loading
  // - Dismissed
  // - Stripe is fully configured
  // - No organization
  if (
    loading ||
    dismissed ||
    !organizationId ||
    (status?.onboardingComplete && status?.payoutsEnabled)
  ) {
    return null;
  }

  // Handle configure click
  const handleConfigure = () => {
    if (!organizationId) return;
    initiateOnboarding({ variables: { organizationId } });
  };

  const isLoading = onboardingLoading || isRedirecting;

  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-between px-4 py-3",
        "bg-zinc-900/80 border border-amber-500/20 rounded-xl",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Left side - Icon + Message */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            Dokończ konfigurację wypłat
          </p>
          <p className="text-xs text-zinc-400">
            Połącz konto bankowe, aby otrzymywać prowizje
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConfigure}
          disabled={isLoading}
          size="sm"
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRedirecting ? "Przekierowuję..." : "Ładuję..."}
            </>
          ) : (
            <>
              Dokończ konfigurację
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
