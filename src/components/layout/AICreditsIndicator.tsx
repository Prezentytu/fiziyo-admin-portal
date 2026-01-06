"use client";

import { useQuery } from "@apollo/client/react";
import { Sparkles, ChevronDown, Zap, TrendingUp } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GET_AI_CREDITS_STATUS } from "@/graphql/queries/aiCredits.queries";

interface AICreditsStatus {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  addonCredits: number;
  totalRemaining: number;
  resetDate: string;
}

export function AICreditsIndicator() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  const { data, loading, error } = useQuery<{ aICreditsStatus: AICreditsStatus }>(
    GET_AI_CREDITS_STATUS,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      pollInterval: 60000, // Odświeżaj co minutę
      errorPolicy: "ignore", // Ignoruj błędy gdy endpoint nie istnieje
    }
  );

  // Nie renderuj nic gdy jest błąd lub brak danych (backend może nie mieć jeszcze tego endpointu)
  if (error || (!loading && !data?.aICreditsStatus)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border/60">
        <Sparkles className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">...</span>
      </div>
    );
  }

  if (!data?.aICreditsStatus) {
    return null;
  }

  const credits = data.aICreditsStatus;
  const percentUsed = credits.monthlyLimit > 0
    ? (credits.monthlyUsed / credits.monthlyLimit) * 100
    : 0;

  // Kolory w zależności od wykorzystania
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 h-auto rounded-lg",
            "bg-surface border border-border/60 hover:bg-surface-light hover:border-border",
            "transition-all duration-200"
          )}
        >
          <Sparkles className={cn("h-4 w-4", getStatusColor())} />
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {credits.totalRemaining}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          {/* Nagłówek */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Kredyty AI</p>
              <p className="text-xs text-muted-foreground">
                Reset za {daysUntilReset} dni
              </p>
            </div>
          </div>

          {/* Pasek postępu */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wykorzystanie</span>
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

          {/* Szczegóły */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Miesięczne</p>
              <p className="font-medium text-foreground">
                {credits.monthlyRemaining}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Dokupione</p>
              <p className="font-medium text-foreground">
                {credits.addonCredits}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Akcje */}
          <div className="space-y-2">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/settings?tab=credits"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Zobacz historię</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/settings?tab=credits"
                className="flex items-center gap-2 text-primary"
              >
                <Zap className="h-4 w-4" />
                <span>Doładuj kredyty</span>
              </Link>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
