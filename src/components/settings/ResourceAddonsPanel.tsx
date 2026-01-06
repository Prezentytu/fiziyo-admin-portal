"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Users,
  UserPlus,
  Building2,
  Plus,
  Minus,
  TrendingUp,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  GET_RESOURCE_ADDONS_STATUS,
  GET_ADDON_PRICING,
} from "@/graphql/queries/aiCredits.queries";
import {
  PURCHASE_RESOURCE_ADDON,
  CANCEL_RESOURCE_ADDON,
} from "@/graphql/mutations/aiCredits.mutations";

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
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; type: string; label: string } | null>(null);

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

  interface PurchaseAddonResponse {
    purchaseResourceAddon: {
      success: boolean;
      message: string;
    };
  }

  interface CancelAddonResponse {
    cancelResourceAddon: {
      success: boolean;
      message: string;
    };
  }

  const [purchaseAddon, { loading: purchasing }] = useMutation<PurchaseAddonResponse>(PURCHASE_RESOURCE_ADDON, {
    onCompleted: (data) => {
      if (data.purchaseResourceAddon.success) {
        toast.success(data.purchaseResourceAddon.message);
        refetch();
      } else {
        toast.error(data.purchaseResourceAddon.message);
      }
    },
    onError: (error) => toast.error(`Błąd: ${error.message}`),
  });

  const [cancelAddon, { loading: cancelling }] = useMutation<CancelAddonResponse>(CANCEL_RESOURCE_ADDON, {
    onCompleted: (data) => {
      if (data.cancelResourceAddon.success) {
        toast.success(data.cancelResourceAddon.message);
        refetch();
      } else {
        toast.error(data.cancelResourceAddon.message);
      }
      setCancelDialog(null);
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
      setCancelDialog(null);
    },
  });

  const handlePurchase = (addonType: string) => {
    if (!organizationId) return;
    purchaseAddon({ variables: { organizationId, addonType, quantity: 1 } });
  };

  const handleCancel = (addonType: string) => {
    if (!organizationId) return;
    cancelAddon({ variables: { organizationId, addonType } });
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

  // Compact mode - Dashboard style list with readable fonts
  if (compact) {
    return (
      <>
        <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-4 text-lg font-semibold">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span>Rozszerzenia zasobów</span>
                  {hasAnyAddons && (
                    <p className="text-sm text-cyan-500 font-normal">
                      +{status.monthlyAddonsCost.toFixed(0)} zł/miesiąc
                    </p>
                  )}
                </div>
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-2">
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
                  onClick={() => handlePurchase(config.type)}
                  disabled={purchasing}
                  className={cn(
                    "group flex items-center gap-4 py-4 px-5 rounded-xl w-full text-left",
                    "transition-all duration-300 cursor-pointer",
                    "hover:bg-surface-light hover:shadow-lg hover:-translate-y-0.5",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                    hasAddon && "bg-cyan-500/5 border border-cyan-500/30"
                  )}
                >
                  {/* Icon with animation */}
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl shrink-0",
                    "transition-transform duration-300 group-hover:scale-110",
                    hasAddon ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25" : "bg-surface-light"
                  )}>
                    <Icon className={cn("h-5 w-5", hasAddon ? "text-white" : "text-muted-foreground")} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium text-foreground">{config.label}</span>
                      {hasAddon && (
                        <Badge className="bg-cyan-500/20 text-cyan-500 border-0">
                          +{currentAmount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Limit: {effectiveLimit} • {config.unit} za {price} zł/mies.
                    </p>
                  </div>

                  {/* Actions - visible on hover or when addon exists */}
                  <div className={cn(
                    "flex items-center gap-2 transition-opacity duration-300",
                    hasAddon ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {hasAddon && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelDialog({ open: true, type: config.type, label: config.label });
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      "bg-cyan-500/20 text-cyan-500"
                    )}>
                      {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Chevron with animation */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Cancel Dialog */}
        <AlertDialog open={cancelDialog?.open} onOpenChange={(open) => !open && setCancelDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Anulować rozszerzenie?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Rozszerzenie <strong>{cancelDialog?.label}</strong> zostanie anulowane na koniec okresu rozliczeniowego.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nie</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelDialog && handleCancel(cancelDialog.type)}
                disabled={cancelling}
                className="bg-destructive hover:bg-destructive/90"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Potwierdź anulowanie
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Full mode - for settings page
  return (
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
            <div
              key={config.type}
              className={cn(
                "rounded-xl border p-4 transition-all",
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

              {hasAddon ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePurchase(config.type)}
                    disabled={purchasing}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Więcej
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setCancelDialog({ open: true, type: config.type, label: config.label })}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  size="sm"
                  onClick={() => handlePurchase(config.type)}
                  disabled={purchasing}
                >
                  {purchasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Dodaj
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={cancelDialog?.open} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulować rozszerzenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Rozszerzenie <strong>{cancelDialog?.label}</strong> zostanie anulowane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog && handleCancel(cancelDialog.type)}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Potwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
