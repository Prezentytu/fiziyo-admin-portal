"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GET_STRIPE_CONNECT_STATUS_QUERY } from "@/graphql/queries";
import type { GetStripeConnectStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface StripeReturnHandlerProps {
  organizationId?: string;
}

// ========================================
// Component
// ========================================

/**
 * Handles return from Stripe Connect onboarding
 * Detects ?stripe_return=success or ?stripe_return=canceled in URL
 * Shows toast notification and refreshes Stripe status
 */
export function StripeReturnHandler({
  organizationId,
}: StripeReturnHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const stripeReturn = searchParams.get("stripe_return");

  // Stripe Connect Status query - with refetch
  const { refetch, data } = useQuery<GetStripeConnectStatusResponse>(
    GET_STRIPE_CONNECT_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId || !stripeReturn,
      errorPolicy: "all",
    }
  );

  useEffect(() => {
    if (!stripeReturn || isProcessing) return;

    const handleReturn = async () => {
      setIsProcessing(true);

      if (stripeReturn === "success") {
        // Show loading toast
        const loadingToast = toast.loading("Weryfikacja statusu konta...");

        try {
          // Refetch Stripe status to get updated data
          const result = await refetch();
          const status = result.data?.stripeConnectStatus;

          // Dismiss loading toast
          toast.dismiss(loadingToast);

          if (status?.onboardingComplete) {
            toast.success("Konto Stripe zostało pomyślnie skonfigurowane!", {
              description:
                "Teraz możesz otrzymywać wypłaty prowizji od subskrypcji pacjentów.",
              icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
              duration: 5000,
            });
          } else if (status?.hasConnectedAccount) {
            toast.info("Konto Stripe częściowo skonfigurowane", {
              description:
                "Dokończ konfigurację w Stripe, aby móc otrzymywać wypłaty.",
              duration: 5000,
            });
          } else {
            toast.success("Powrót ze Stripe", {
              description: "Sprawdź status swojego konta.",
              duration: 3000,
            });
          }
        } catch {
          toast.dismiss(loadingToast);
          toast.success("Powrót ze Stripe - odśwież stronę", {
            duration: 3000,
          });
        }
      } else if (stripeReturn === "canceled") {
        toast.info("Konfiguracja anulowana", {
          description:
            "Możesz wrócić do konfiguracji konta Stripe w dowolnym momencie.",
          icon: <XCircle className="h-5 w-5 text-muted-foreground" />,
          duration: 4000,
        });
      } else if (stripeReturn === "refresh") {
        // Handle refresh case - user needs to re-authenticate
        toast.info("Sesja wygasła", {
          description: "Kliknij ponownie 'Skonfiguruj wypłaty' aby kontynuować.",
          duration: 4000,
        });
      }

      // Clean up URL - remove stripe_return parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("stripe_return");
      router.replace(newUrl.pathname, { scroll: false });

      setIsProcessing(false);
    };

    handleReturn();
  }, [stripeReturn, refetch, router, isProcessing]);

  // Show loading overlay while processing
  if (isProcessing && stripeReturn === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface border border-border shadow-xl">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <div className="text-center">
            <p className="font-medium text-foreground">
              Weryfikacja statusu konta...
            </p>
            <p className="text-sm text-muted-foreground">
              To może potrwać kilka sekund
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
