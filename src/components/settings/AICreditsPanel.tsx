"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
  Package,
  ExternalLink,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  GET_AI_CREDITS_STATUS,
  GET_AI_CREDITS_HISTORY,
  GET_AI_CREDITS_PACKAGE_PRICING,
} from "@/graphql/queries/aiCredits.queries";
import { PURCHASE_AI_CREDITS_PACKAGE } from "@/graphql/mutations/aiCredits.mutations";

interface AICreditsStatus {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  addonCredits: number;
  totalRemaining: number;
  resetDate: string;
}

interface AICreditsLog {
  id: string;
  creditsUsed: number;
  actionType: string;
  description: string | null;
  source: string;
  createdAt: string;
}

interface CreditPackage {
  credits: number;
  pricePLN: number;
}

interface PackagePricing {
  smallPackage: CreditPackage;
  mediumPackage: CreditPackage;
  largePackage: CreditPackage;
}

const actionTypeLabels: Record<string, string> = {
  chat: "Chat AI",
  set_generate: "Generowanie zestawu",
  exercise_suggest: "Sugestia ćwiczenia",
  clinical_notes: "Notatki kliniczne",
  document_import: "Import dokumentu",
  voice_parse: "Parsowanie głosu",
};

export function AICreditsPanel() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  const { data: statusData, loading: statusLoading, error: statusError } = useQuery<{
    aICreditsStatus: AICreditsStatus;
  }>(GET_AI_CREDITS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  const { data: historyData, loading: historyLoading } = useQuery<{
    aICreditsHistory: AICreditsLog[];
  }>(GET_AI_CREDITS_HISTORY, {
    variables: { organizationId: organizationId || "", days: 30 },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  const { data: pricingData, error: pricingError } = useQuery<{
    aICreditsPackagePricing: PackagePricing;
  }>(GET_AI_CREDITS_PACKAGE_PRICING, {
    errorPolicy: "ignore",
  });

  // Jeśli backend nie ma jeszcze tych endpointów, pokaż informację
  if (statusError || pricingError) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              System kredytów AI będzie dostępny wkrótce.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [purchasePackage, { loading: purchasing }] = useMutation(
    PURCHASE_AI_CREDITS_PACKAGE,
    {
      onCompleted: (data) => {
        if (data.purchaseAICreditsPackage.success && data.purchaseAICreditsPackage.checkoutUrl) {
          window.location.href = data.purchaseAICreditsPackage.checkoutUrl;
        } else {
          toast.error(data.purchaseAICreditsPackage.message || "Błąd podczas zakupu");
        }
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const handlePurchase = (packageType: string) => {
    if (!organizationId) return;
    purchasePackage({
      variables: {
        organizationId,
        packageType,
      },
    });
  };

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const credits = statusData?.aICreditsStatus;
  if (!credits) return null;

  const percentUsed =
    credits.monthlyLimit > 0 ? (credits.monthlyUsed / credits.monthlyLimit) * 100 : 0;

  const getStatusColor = () => {
    if (percentUsed < 50) return "text-primary";
    if (percentUsed < 80) return "text-yellow-500";
    return "text-destructive";
  };

  const getProgressColor = () => {
    if (percentUsed < 50) return "bg-primary";
    if (percentUsed < 80) return "bg-yellow-500";
    return "bg-destructive";
  };

  const resetDate = new Date(credits.resetDate);
  const daysUntilReset = Math.ceil(
    (resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const packages = pricingData?.aICreditsPackagePricing;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Kredyty AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wykorzystanie miesięczne</span>
              <span className={cn("font-medium", getStatusColor())}>
                {credits.monthlyUsed} / {credits.monthlyLimit}
              </span>
            </div>
            <Progress
              value={percentUsed}
              className="h-2"
              indicatorClassName={getProgressColor()}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-surface-light p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{credits.monthlyRemaining}</p>
              <p className="text-xs text-muted-foreground">Miesięczne</p>
            </div>
            <div className="rounded-lg bg-surface-light p-3 text-center">
              <p className="text-2xl font-bold text-primary">{credits.addonCredits}</p>
              <p className="text-xs text-muted-foreground">Dokupione</p>
            </div>
            <div className="rounded-lg bg-surface-light p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{credits.totalRemaining}</p>
              <p className="text-xs text-muted-foreground">Razem</p>
            </div>
          </div>

          {/* Reset Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Reset za {daysUntilReset} dni ({resetDate.toLocaleDateString("pl-PL")})</span>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Packages */}
      {packages && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-primary" />
              Doładuj kredyty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { type: "small", pkg: packages.smallPackage, label: "Mały" },
                { type: "medium", pkg: packages.mediumPackage, label: "Średni", popular: true },
                { type: "large", pkg: packages.largePackage, label: "Duży" },
              ].map(({ type, pkg, label, popular }) => (
                <div
                  key={type}
                  className={cn(
                    "relative rounded-xl border p-4 transition-all hover:border-primary/50",
                    popular ? "border-primary shadow-md shadow-primary/10" : "border-border/60"
                  )}
                >
                  {popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px]">
                      Najlepszy stosunek
                    </Badge>
                  )}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{pkg.credits}</p>
                    <p className="text-xs text-muted-foreground">kredytów</p>
                    <div className="pt-2">
                      <p className="text-lg font-semibold text-primary">{pkg.pricePLN} zł</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(pkg.pricePLN / pkg.credits).toFixed(2)} zł/kredyt
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      variant={popular ? "default" : "outline"}
                      onClick={() => handlePurchase(type)}
                      disabled={purchasing}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Kup
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historia zużycia (30 dni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : historyData?.aICreditsHistory?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Brak historii zużycia
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historyData?.aICreditsHistory?.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-light"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {actionTypeLabels[log.actionType] || log.actionType}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleDateString("pl-PL")}
                        {log.source === "addon" && (
                          <Badge variant="outline" className="text-[9px] ml-1">
                            addon
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-destructive">-{log.creditsUsed}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
