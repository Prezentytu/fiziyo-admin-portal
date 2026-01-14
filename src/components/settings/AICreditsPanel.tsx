"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
  Package,
  ChevronDown,
  Bot,
  FileText,
  MessageSquare,
  Mic,
  FileUp,
  RefreshCw,
  Star,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  GET_AI_CREDITS_STATUS,
  GET_AI_CREDITS_HISTORY,
  GET_AI_CREDITS_PACKAGE_PRICING,
} from "@/graphql/queries/aiCredits.queries";
import { PurchaseCreditsDialog } from "@/components/shared/PurchaseCreditsDialog";

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

interface AICreditsReadonlyPanelProps {
  compact?: boolean;
}

// Action type config with icons
const actionTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  chat: { label: "Chat AI", icon: MessageSquare, color: "text-blue-400" },
  set_generate: { label: "Generowanie zestawu", icon: Bot, color: "text-purple-400" },
  exercise_suggest: { label: "Sugestia ćwiczenia", icon: Sparkles, color: "text-primary" },
  clinical_notes: { label: "Notatki", icon: FileText, color: "text-amber-400" },
  document_import: { label: "Import dokumentu", icon: FileUp, color: "text-cyan-400" },
  voice_parse: { label: "Rozpoznawanie mowy", icon: Mic, color: "text-pink-400" },
};

// Grupowanie logów po dacie
function groupLogsByDate(logs: AICreditsLog[]): Record<string, AICreditsLog[]> {
  return logs.reduce((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString("pl-PL");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AICreditsLog[]>);
}

// Custom event do odświeżania kredytów z dowolnego miejsca w aplikacji
// Użycie: window.dispatchEvent(new CustomEvent('ai-credits-changed'))
export const triggerCreditsRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-credits-changed'));
  }
};

export function AICreditsPanel({ compact = false }: AICreditsReadonlyPanelProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const { data: statusData, loading: statusLoading, error: statusError, refetch } = useQuery<{
    aiCreditsStatus: AICreditsStatus;
  }>(GET_AI_CREDITS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
    // Bez pollInterval - refetch tylko gdy potrzebne
  });

  // Nasłuchuj na event 'ai-credits-changed' i odśwież dane
  useEffect(() => {
    const handleCreditsChanged = () => {
      if (organizationId) {
        refetch();
      }
    };

    window.addEventListener('ai-credits-changed', handleCreditsChanged);
    return () => window.removeEventListener('ai-credits-changed', handleCreditsChanged);
  }, [organizationId, refetch]);

  const { data: historyData, loading: historyLoading } = useQuery<{
    aiCreditsHistory: AICreditsLog[];
  }>(GET_AI_CREDITS_HISTORY, {
    variables: { organizationId: organizationId || "", days: 30 },
    skip: !organizationId || compact,
    errorPolicy: "ignore",
  });

  const { data: pricingData, error: pricingError } = useQuery<{
    aiCreditsPackagePricing: PackagePricing;
  }>(GET_AI_CREDITS_PACKAGE_PRICING, {
    skip: compact,
    errorPolicy: "ignore",
  });

  // Get data references
  const credits = statusData?.aiCreditsStatus;
  const packages = pricingData?.aiCreditsPackagePricing;
  const aiCreditsHistory = historyData?.aiCreditsHistory;

  // Calculate derived values
  const groupedHistory = useMemo(() =>
    aiCreditsHistory ? groupLogsByDate(aiCreditsHistory) : {},
    [aiCreditsHistory]
  );

  // Progi "niskiego stanu" - poniżej 20% lub poniżej 50 kredytów
  const LOW_THRESHOLD_PERCENT = 20;
  const LOW_THRESHOLD_ABSOLUTE = 50;

  // Obliczenia bazujące na DOSTĘPNYCH kredytach, nie zużytych
  const totalCapacity = credits ? credits.monthlyLimit + credits.addonCredits : 0;
  const remaining = credits?.totalRemaining ?? 0;
  const availablePercent = totalCapacity > 0 ? (remaining / totalCapacity) * 100 : 0;

  // Niski stan = poniżej 20% LUB poniżej 50 kredytów
  const isLow = remaining > 0 && (availablePercent < LOW_THRESHOLD_PERCENT || remaining < LOW_THRESHOLD_ABSOLUTE);
  const isEmpty = remaining <= 0;
  const resetDate = credits ? new Date(credits.resetDate) : new Date();

  const daysUntilReset = useMemo(() => {
    if (!credits) return 0;
    const reset = new Date(credits.resetDate);
    const now = new Date();
    const diffTime = reset.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [credits]);

  // Error state
  if (statusError || (!compact && pricingError)) {
    return (
      <Card className="relative overflow-hidden rounded-xl border border-border/50 bg-card/30 h-full group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-cyan-500" />
        <CardContent className="relative p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 mb-4 shadow-lg shadow-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">Kredyty AI</h3>
          <p className="text-sm text-muted-foreground">
            Wkrótce dostępne
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pokazuj skeleton tylko przy pierwszym ładowaniu (nie przy refetch)
  if (statusLoading && !credits) {
    return (
      <Card className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) return null;

  // Compact mode - Dashboard style card
  if (compact) {
    return (
      <>
        <Card className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden group">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-110 duration-300",
                  isEmpty
                    ? "bg-gradient-to-br from-destructive to-red-600 shadow-destructive/25"
                    : isLow
                    ? "bg-gradient-to-br from-warning to-orange-600 shadow-warning/25"
                    : "bg-gradient-to-br from-primary to-emerald-600 shadow-primary/25"
                )}>
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight">Kredyty AI</span>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reset za {daysUntilReset} dni</p>
                </div>
              </CardTitle>
              <Button
                onClick={() => setIsPurchaseDialogOpen(true)}
                className={cn(
                  "gap-2 rounded-xl font-bold h-10 px-6 shadow-lg transition-all",
                  isEmpty
                    ? "bg-destructive text-white hover:bg-destructive/90 shadow-destructive/20"
                    : isLow
                    ? "bg-warning text-white hover:bg-warning/90 shadow-warning/20"
                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                )}
              >
                <Zap className="h-4 w-4" />
                Doładuj
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {/* Main credits display - pokazuje DOSTĘPNE */}
            <div className="rounded-xl bg-background/50 p-6 border border-border/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Dostępne</span>
                <span className={cn(
                  "text-4xl font-bold tabular-nums tracking-tighter",
                  isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-primary"
                )}>
                  {remaining}
                </span>
              </div>
              {/* Pasek pokazuje stan DOSTĘPNYCH (pełny = dużo) */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r shadow-inner",
                    isEmpty ? "from-destructive to-red-600" : isLow ? "from-warning to-orange-500" : "from-primary to-emerald-500"
                  )}
                  style={{ width: `${Math.min(availablePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats row - Breakdown skąd masz kredyty */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-surface-light/50 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {credits.monthlyRemaining}
                </p>
                <p className="text-xs text-muted-foreground">Z planu</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center border border-primary/20">
                <p className="text-2xl font-bold text-primary tabular-nums">{credits.addonCredits}</p>
                <p className="text-xs text-muted-foreground">Dokupione</p>
              </div>
              <div className="rounded-lg bg-surface-light/50 p-3 text-center">
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-foreground"
                )}>
                  {credits.totalRemaining}
                </p>
                <p className="text-xs text-muted-foreground">Razem</p>
              </div>
            </div>

            {/* Warning only when actually low or empty */}
            {(isEmpty || isLow) && (
              <div className={cn(
                "flex items-center gap-3 rounded-lg p-3",
                isEmpty ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              )}>
                <Zap className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{isEmpty ? "Brak kredytów AI!" : "Niski stan kredytów"}</p>
                  <p className="text-xs opacity-80">{isEmpty ? "Doładuj aby korzystać z AI" : "Rozważ doładowanie"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Dialog */}
        <PurchaseCreditsDialog
          isOpen={isPurchaseDialogOpen}
          onClose={() => setIsPurchaseDialogOpen(false)}
          organizationId={organizationId}
        />
      </>
    );
  }

  // Full mode - complete panel with packages and history
  return (
    <div className="space-y-4">
      {/* Main Credits Status Card */}
      <Card className="relative overflow-hidden border-border/60 group">
        <div className={cn(
          "absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity",
          isEmpty
            ? "bg-gradient-to-br from-destructive/5 via-transparent to-red-500/5"
            : isLow
            ? "bg-gradient-to-br from-warning/5 via-transparent to-orange-500/5"
            : "bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5"
        )} />
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isEmpty
            ? "bg-gradient-to-r from-destructive via-red-500 to-orange-500"
            : isLow
            ? "bg-gradient-to-r from-warning via-orange-500 to-yellow-500"
            : "bg-gradient-to-r from-primary via-emerald-500 to-cyan-500"
        )} />

        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                isEmpty
                  ? "bg-gradient-to-br from-destructive to-red-600 shadow-destructive/25"
                  : isLow
                  ? "bg-gradient-to-br from-warning to-orange-600 shadow-warning/25"
                  : "bg-gradient-to-br from-primary to-emerald-600 shadow-primary/25"
              )}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              Kredyty AI
            </CardTitle>
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Reset za {daysUntilReset} dni
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6">
          {/* Główna liczba - DOSTĘPNE kredyty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dostępne kredyty</span>
              <span className={cn(
                "text-4xl font-bold tabular-nums",
                isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-primary"
              )}>
                {remaining}
              </span>
            </div>

            {/* Pasek pokazuje stan DOSTĘPNYCH (pełny = dużo) */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r",
                  isEmpty ? "from-destructive to-red-600"
                    : isLow ? "from-warning to-orange-500"
                    : "from-primary to-emerald-500"
                )}
                style={{ width: `${Math.min(availablePercent, 100)}%` }}
              />
              {!isEmpty && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              )}
            </div>
          </div>

          {/* Stats grid - breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-light/50 p-4 text-center border border-border/40 hover:border-primary/30 transition-colors">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {credits.monthlyRemaining}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Z planu</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 p-4 text-center border border-primary/20 hover:border-primary/40 transition-colors">
              <p className="text-3xl font-bold text-primary tabular-nums">{credits.addonCredits}</p>
              <p className="text-xs text-muted-foreground mt-1">Dokupione</p>
            </div>
            <div className={cn(
              "rounded-xl p-4 text-center border transition-colors",
              isEmpty
                ? "bg-destructive/10 border-destructive/30"
                : isLow
                ? "bg-warning/10 border-warning/30"
                : "bg-surface-light/50 border-border/40 hover:border-primary/30"
            )}>
              <p className={cn(
                "text-3xl font-bold tabular-nums",
                isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-foreground"
              )}>
                {credits.totalRemaining}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Razem</p>
            </div>
          </div>

          {/* Reset date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-surface-light/30 rounded-lg p-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              Następny reset: <span className="text-foreground font-medium">{resetDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
            </span>
          </div>

          {/* Low credits warning - only when actually low */}
          {(isLow || isEmpty) && (
            <div className={cn(
              "flex items-center gap-4 rounded-xl p-4 border",
              isEmpty ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
            )}>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                isEmpty ? "bg-destructive/20" : "bg-warning/20"
              )}>
                <Zap className={cn("h-5 w-5", isEmpty ? "text-destructive" : "text-warning")} />
              </div>
              <div className="flex-1">
                <p className={cn("font-medium", isEmpty ? "text-destructive" : "text-warning")}>
                  {isEmpty ? "Brak kredytów" : "Niski stan kredytów"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEmpty ? "Doładuj kredyty, aby korzystać z funkcji AI" : "Pozostało mniej niż 20% lub 50 kredytów"}
                </p>
              </div>
              <Button
                size="sm"
                className={cn(
                  "gap-2 shrink-0",
                  isEmpty
                    ? "bg-gradient-to-r from-destructive to-red-600"
                    : "bg-gradient-to-r from-warning to-orange-600"
                )}
                onClick={() => setIsPurchaseDialogOpen(true)}
              >
                <Zap className="h-4 w-4" />
                Doładuj
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Packages */}
      {packages && (
        <Card id="purchase-section" className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              Doładuj kredyty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { type: "small", pkg: packages.smallPackage, label: "Starter", icon: Package },
                { type: "medium", pkg: packages.mediumPackage, label: "Popular", icon: Zap, popular: true },
                { type: "large", pkg: packages.largePackage, label: "Power", icon: Star, best: true },
              ].map(({ type, pkg, label, icon: Icon, popular, best }) => (
                <button
                  key={type}
                  onClick={() => setIsPurchaseDialogOpen(true)}
                  className={cn(
                    "group relative rounded-2xl border-2 p-5 text-left transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-xl cursor-pointer",
                    popular ? "border-primary shadow-lg shadow-primary/20 bg-primary/5" : "border-border/60 hover:border-primary/50"
                  )}
                >
                  {(popular || best) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-emerald-600 text-white border-0 shadow-lg shadow-primary/25 px-3">
                        {best ? (
                          <>
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Najlepsza cena
                          </>
                        ) : "Popularne"}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                        popular || best ? "bg-gradient-to-br from-primary to-emerald-600" : "bg-surface-light"
                      )}>
                        <Icon className={cn("h-5 w-5", popular || best ? "text-white" : "text-muted-foreground")} />
                      </div>
                      <span className="font-medium text-foreground">{label}</span>
                    </div>

                    <div>
                      <p className="text-4xl font-bold text-foreground">{pkg.credits}</p>
                      <p className="text-sm text-muted-foreground">kredytów</p>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">{pkg.pricePLN}</span>
                        <span className="text-sm text-muted-foreground">zł</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(pkg.pricePLN / pkg.credits).toFixed(2)} zł/kredyt
                      </p>
                    </div>

                    <div className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg transition-colors",
                      popular ? "bg-primary text-primary-foreground" : "bg-surface-light text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-medium">Kup teraz</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History */}
      <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <Card className="border-border/60">
          <CollapsibleTrigger asChild>
            <button className="w-full">
              <CardHeader className="pb-3 hover:bg-surface-light/30 transition-colors rounded-t-xl cursor-pointer">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/25">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    Historia zużycia
                    <Badge variant="secondary" className="text-xs">30 dni</Badge>
                  </CardTitle>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isHistoryOpen && "rotate-180"
                  )} />
                </div>
              </CardHeader>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {historyLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Brak historii zużycia w tym okresie</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {Object.entries(groupedHistory).map(([date, logs]) => (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-xs font-medium text-muted-foreground px-2">{date}</span>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>

                      <div className="space-y-2">
                        {logs.map((log) => {
                          const config = actionTypeConfig[log.actionType] || {
                            label: log.actionType,
                            icon: Sparkles,
                            color: "text-muted-foreground",
                          };
                          const LogIcon = config.icon;

                          return (
                            <div
                              key={log.id}
                              className="group flex items-center justify-between py-3 px-4 rounded-xl bg-surface-light/50 hover:bg-surface-light transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface transition-colors group-hover:bg-surface-light">
                                  <LogIcon className={cn("h-4 w-4", config.color)} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{config.label}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {new Date(log.createdAt).toLocaleTimeString("pl-PL", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {log.source === "addon" && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">addon</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-destructive tabular-nums">
                                -{log.creditsUsed}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Purchase Dialog */}
      <PurchaseCreditsDialog
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        organizationId={organizationId}
      />
    </div>
  );
}
