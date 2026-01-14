"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  CreditCard,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { GET_STRIPE_CONNECT_STATUS_QUERY } from "@/graphql/queries";
import { INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION } from "@/graphql/mutations";
import type {
  GetStripeConnectStatusResponse,
  InitiateStripeConnectOnboardingResponse,
} from "@/types/apollo";
import { formatCurrency } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface StripeConnectCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function StripeConnectCard({
  organizationId,
  className,
}: StripeConnectCardProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch Stripe Connect status
  const { data, loading, error, refetch } =
    useQuery<GetStripeConnectStatusResponse>(GET_STRIPE_CONNECT_STATUS_QUERY, {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    });

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
              // Redirect to Stripe onboarding
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

  // Handle onboarding click
  const handleStartOnboarding = () => {
    if (!organizationId) return;
    initiateOnboarding({ variables: { organizationId } });
  };

  // Handle open Stripe dashboard
  const handleOpenDashboard = () => {
    // Stripe Express Dashboard URL
    window.open("https://dashboard.stripe.com/", "_blank");
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground">
            Nie udało się pobrać statusu Stripe
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not connected - show onboarding prompt
  if (!status?.hasConnectedAccount || !status?.onboardingComplete) {
    return (
      <Card
        className={cn(
          "border-amber-500/30 bg-gradient-to-br from-surface to-amber-500/5",
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-amber-500" />
            Konto Wypłat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning message */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">
                Skonfiguruj wypłaty
              </p>
              <p className="text-sm text-muted-foreground">
                Aby otrzymywać prowizje od subskrypcji pacjentów, połącz swoje
                konto bankowe przez Stripe.
              </p>
            </div>
          </div>

          {/* Benefits list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Bezpieczne płatności przez Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4 text-primary" />
              <span>Automatyczne wypłaty na Twoje konto</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleStartOnboarding}
            disabled={onboardingLoading || isRedirecting}
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {onboardingLoading || isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRedirecting ? "Przekierowuję..." : "Przygotowuję..."}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Skonfiguruj wypłaty
                <ExternalLink className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>

          {/* Partial progress indicator */}
          {status?.hasConnectedAccount && !status?.onboardingComplete && (
            <p className="text-xs text-center text-muted-foreground">
              Konfiguracja w toku - dokończ ją w Stripe
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Connected - show status
  return (
    <Card
      className={cn(
        "border-emerald-500/30 bg-gradient-to-br from-surface to-emerald-500/5",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-emerald-500" />
          Konto Wypłat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Stripe Connect</p>
              <p className="text-xs text-muted-foreground">Konto aktywne</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
            Połączono
          </Badge>
        </div>

        {/* Balance info */}
        {(status.availableBalance > 0 || status.pendingBalance > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-light p-3">
              <p className="text-xs text-muted-foreground mb-1">Dostępne</p>
              <p className="text-lg font-bold text-emerald-500 tabular-nums">
                {formatCurrency(status.availableBalance)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-light p-3">
              <p className="text-xs text-muted-foreground mb-1">Oczekujące</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatCurrency(status.pendingBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {status.chargesEnabled && (
            <Badge variant="outline" className="text-xs border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
              Płatności aktywne
            </Badge>
          )}
          {status.payoutsEnabled && (
            <Badge variant="outline" className="text-xs border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
              Wypłaty aktywne
            </Badge>
          )}
        </div>

        {/* Dashboard button */}
        <Button
          variant="outline"
          onClick={handleOpenDashboard}
          className="w-full gap-2"
        >
          Otwórz Dashboard Stripe
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
