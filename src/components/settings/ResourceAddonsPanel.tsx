"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Users,
  UserPlus,
  Building2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  GET_RESOURCE_ADDONS_STATUS,
  GET_ADDON_PRICING,
} from "@/graphql/queries/aiCredits.queries";
import { PurchaseAddonsDialog } from "@/components/shared/PurchaseAddonsDialog";

interface ResourceAddonsStatus {
  additionalPatients: number;
  additionalTherapists: number;
  additionalClinics: number;
  effectiveMaxPatients: number;
  effectiveMaxTherapists: number;
  effectiveMaxClinics: number;
  monthlyAddonsCost: number;
}

interface AddonPricing {
  patients10: number;
  therapist1: number;
  clinic1: number;
}

interface AddonConfig {
  type: "patients" | "therapists" | "clinics";
  icon: React.ElementType;
  label: string;
  unit: string;
  priceKey: keyof AddonPricing;
  currentKey: keyof ResourceAddonsStatus;
  effectiveKey: keyof ResourceAddonsStatus;
}

interface ResourceAddonsPanelProps {
  compact?: boolean;
}

const addonConfigs: AddonConfig[] = [
  {
    type: "patients",
    icon: Users,
    label: "Pacjenci",
    unit: "+10",
    priceKey: "patients10",
    currentKey: "additionalPatients",
    effectiveKey: "effectiveMaxPatients",
  },
  {
    type: "therapists",
    icon: UserPlus,
    label: "Terapeuci",
    unit: "+1",
    priceKey: "therapist1",
    currentKey: "additionalTherapists",
    effectiveKey: "effectiveMaxTherapists",
  },
  {
    type: "clinics",
    icon: Building2,
    label: "Gabinety",
    unit: "+1",
    priceKey: "clinic1",
    currentKey: "additionalClinics",
    effectiveKey: "effectiveMaxClinics",
  },
];

export function ResourceAddonsPanel({ compact = false }: ResourceAddonsPanelProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialAddonType, setInitialAddonType] = useState<"patients" | "therapists" | "clinics" | undefined>();

  const { data: statusData, loading: statusLoading, refetch, error: statusError } = useQuery<{
    resourceAddonsStatus: ResourceAddonsStatus;
  }>(GET_RESOURCE_ADDONS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  const { data: pricingData } = useQuery<{ addonPricing: AddonPricing }>(GET_ADDON_PRICING, {
    errorPolicy: "ignore",
  });

  const openDialog = (type: "patients" | "therapists" | "clinics") => {
    setInitialAddonType(type);
    setDialogOpen(true);
  };

  const fallbackPricing: AddonPricing = { patients10: 25, therapist1: 35, clinic1: 29 };
  const pricing = pricingData?.addonPricing || fallbackPricing;

  // Error/Loading states
  if (statusError) {
    return (
      <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Rozszerzenia wkrótce dostępne
        </CardContent>
      </Card>
    );
  }

  if (statusLoading) {
    return (
      <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const status = statusData?.resourceAddonsStatus;
  if (!status) return null;

  const hasAnyAddons = status.additionalPatients > 0 || status.additionalTherapists > 0 || status.additionalClinics > 0;

  // Compact mode - Dashboard style
  if (compact) {
    return (
      <>
        <Card className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden group">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 transition-transform group-hover:scale-110 duration-300">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-foreground">Rozszerzenia zasobów</span>
                  {hasAnyAddons && (
                    <p className="text-sm text-cyan-500 font-bold uppercase tracking-wider mt-0.5">
                      +{status.monthlyAddonsCost.toFixed(0)} zł / m
                    </p>
                  )}
                </div>
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {addonConfigs.map((config) => {
              const currentAmount = status[config.currentKey] as number;
              const effectiveLimit = status[config.effectiveKey] as number;
              const price = pricing[config.priceKey];
              const hasAddon = currentAmount > 0;
              const Icon = config.icon;

              return (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => openDialog(config.type)}
                  data-testid={`addon-${config.type}-btn`}
                  className={cn(
                    "group flex items-center gap-4 py-4 px-5 rounded-xl w-full text-left",
                    "transition-all duration-300 cursor-pointer border",
                    "hover:bg-background hover:shadow-lg hover:border-cyan-500/30",
                    hasAddon ? "bg-cyan-500/5 border-cyan-500/30 shadow-sm" : "bg-background/50 border-border/40"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110",
                    hasAddon ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25" : "bg-surface-light"
                  )}>
                    <Icon className={cn("h-5 w-5", hasAddon ? "text-white" : "text-muted-foreground")} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-foreground">{config.label}</span>
                      {hasAddon && (
                        <Badge className="bg-cyan-500 text-white border-0 text-[10px] font-bold h-5 shadow-sm shadow-cyan-500/20">
                          +{currentAmount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Limit: <span className="text-foreground font-bold">{effectiveLimit}</span>
                      </p>
                      <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        {price} zł/m
                      </p>
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Purchase Dialog */}
        <PurchaseAddonsDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setInitialAddonType(undefined);
          }}
          organizationId={organizationId}
          initialAddonType={initialAddonType}
          onSuccess={() => refetch()}
        />
      </>
    );
  }

  // Full mode - for settings page
  return (
    <>
      <div className="space-y-4">
        {hasAnyAddons && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="font-medium">Aktywne rozszerzenia</p>
                  <div className="flex gap-2 mt-1">
                    {status.additionalPatients > 0 && (
                      <Badge className="bg-cyan-500/20 text-cyan-500 border-0 text-xs">
                        +{status.additionalPatients} pacjentów
                      </Badge>
                    )}
                    {status.additionalTherapists > 0 && (
                      <Badge className="bg-cyan-500/20 text-cyan-500 border-0 text-xs">
                        +{status.additionalTherapists} terapeutów
                      </Badge>
                    )}
                    {status.additionalClinics > 0 && (
                      <Badge className="bg-cyan-500/20 text-cyan-500 border-0 text-xs">
                        +{status.additionalClinics} gabinetów
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-cyan-500">+{status.monthlyAddonsCost.toFixed(0)} zł/m</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {addonConfigs.map((config) => {
            const currentAmount = status[config.currentKey] as number;
            const effectiveLimit = status[config.effectiveKey] as number;
            const price = pricing[config.priceKey];
            const hasAddon = currentAmount > 0;
            const Icon = config.icon;

            return (
              <button
                key={config.type}
                type="button"
                onClick={() => openDialog(config.type)}
                data-testid={`addon-${config.type}-card-btn`}
                className={cn(
                  "rounded-xl border p-4 transition-all text-left",
                  "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
                  hasAddon ? "border-cyan-500/50 bg-cyan-500/5" : "border-border/60 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">Limit: {effectiveLimit}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{config.unit}</span>
                  <span className="font-bold">{price} zł/m</span>
                </div>

                {hasAddon && (
                  <div className="text-xs text-cyan-500">
                    Aktywne: +{currentAmount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchase Dialog */}
      <PurchaseAddonsDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setInitialAddonType(undefined);
        }}
        organizationId={organizationId}
        initialAddonType={initialAddonType}
        onSuccess={() => refetch()}
      />
    </>
  );
}
