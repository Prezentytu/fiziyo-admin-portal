"use client";

import { useQuery } from "@apollo/client/react";
import { Sparkles, Zap, X } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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

interface LowCreditsWarningProps {
  threshold?: number;
  className?: string;
}

export function LowCreditsWarning({ threshold = 10, className }: LowCreditsWarningProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [dismissed, setDismissed] = useState(false);

  const { data, error } = useQuery<{ aiCreditsStatus: AICreditsStatus }>(GET_AI_CREDITS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    pollInterval: 60000,
    errorPolicy: "ignore",
  });

  if (dismissed || error) return null;

  const credits = data?.aiCreditsStatus;
  if (!credits || credits.totalRemaining >= threshold) return null;

  const isZero = credits.totalRemaining === 0;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg border p-4 transition-all",
        isZero
          ? "bg-destructive/10 border-destructive/50"
          : "bg-yellow-500/10 border-yellow-500/50",
        className
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
          isZero ? "bg-destructive/20" : "bg-yellow-500/20"
        )}
      >
        <Sparkles className={cn("h-5 w-5", isZero ? "text-destructive" : "text-yellow-500")} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isZero ? "text-destructive" : "text-yellow-600")}>
          {isZero
            ? "Brak kredytów AI"
            : `Pozostało tylko ${credits.totalRemaining} kredytów AI`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isZero
            ? "Nie możesz korzystać z funkcji AI. Doładuj kredyty aby kontynuować."
            : "Doładuj kredyty aby kontynuować korzystanie z funkcji AI."}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant={isZero ? "destructive" : "default"}>
          <Link href="/billing">
            <Zap className="h-4 w-4 mr-1" />
            Doładuj
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
