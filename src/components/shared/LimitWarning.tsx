"use client";

import { useQuery } from "@apollo/client/react";
import { Users, Building2, UserPlus, AlertTriangle, Plus, TrendingUp, X } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GET_RESOURCE_ADDONS_STATUS } from "@/graphql/queries/aiCredits.queries";

interface ResourceAddonsStatus {
  additionalPatients: number;
  additionalTherapists: number;
  additionalClinics: number;
  effectiveMaxPatients: number;
  effectiveMaxTherapists: number;
  effectiveMaxClinics: number;
  monthlyAddonsCost: number;
}

interface LimitWarningProps {
  type: "patients" | "therapists" | "clinics";
  currentUsage: number;
  threshold?: number;
  className?: string;
}

const configs = {
  patients: {
    icon: Users,
    label: "pacjentów",
    limitKey: "effectiveMaxPatients" as keyof ResourceAddonsStatus,
  },
  therapists: {
    icon: UserPlus,
    label: "terapeutów",
    limitKey: "effectiveMaxTherapists" as keyof ResourceAddonsStatus,
  },
  clinics: {
    icon: Building2,
    label: "gabinetów",
    limitKey: "effectiveMaxClinics" as keyof ResourceAddonsStatus,
  },
};

export function LimitWarning({
  type,
  currentUsage,
  threshold = 0.9,
  className,
}: LimitWarningProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [dismissed, setDismissed] = useState(false);

  const { data, error } = useQuery<{ resourceAddonsStatus: ResourceAddonsStatus }>(
    GET_RESOURCE_ADDONS_STATUS,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "ignore",
    }
  );

  if (dismissed || error) return null;

  const status = data?.resourceAddonsStatus;
  if (!status) return null;

  const config = configs[type];
  const limit = status[config.limitKey] as number;
  const usagePercent = limit > 0 ? currentUsage / limit : 0;

  // Pokaż tylko gdy wykorzystanie > threshold (domyślnie 90%)
  if (usagePercent < threshold) return null;

  const isAtLimit = currentUsage >= limit;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg border p-4 transition-all",
        isAtLimit
          ? "bg-destructive/10 border-destructive/50"
          : "bg-yellow-500/10 border-yellow-500/50",
        className
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
          isAtLimit ? "bg-destructive/20" : "bg-yellow-500/20"
        )}
      >
        {isAtLimit ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <Icon className="h-5 w-5 text-yellow-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isAtLimit ? "text-destructive" : "text-yellow-600")}>
          {isAtLimit
            ? `Osiągnięto limit ${config.label}`
            : `Zbliżasz się do limitu ${config.label}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {currentUsage}/{limit} {config.label}
          {isAtLimit
            ? " - rozszerz limit lub przejdź na wyższy plan"
            : ` (${Math.round(usagePercent * 100)}% wykorzystania)`}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant="outline">
          <Link href="/settings?tab=addons">
            <Plus className="h-4 w-4 mr-1" />
            Rozszerz
          </Link>
        </Button>
        <Button asChild size="sm" variant={isAtLimit ? "destructive" : "default"}>
          <Link href="/settings?tab=plan">
            <TrendingUp className="h-4 w-4 mr-1" />
            Plany
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
