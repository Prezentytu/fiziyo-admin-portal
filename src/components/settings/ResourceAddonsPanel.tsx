"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import {
  Users,
  UserPlus,
  Building2,
  Plus,
  Minus,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
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
  icon: React.ReactNode;
  label: string;
  unit: string;
  unitAmount: number;
  priceKey: keyof AddonPricing;
  currentKey: keyof ResourceAddonsStatus;
  effectiveKey: keyof ResourceAddonsStatus;
}

const addonConfigs: AddonConfig[] = [
  {
    type: "patients",
    icon: <Users className="h-5 w-5" />,
    label: "Pacjenci",
    unit: "+10 pacjentów",
    unitAmount: 10,
    priceKey: "patients10",
    currentKey: "additionalPatients",
    effectiveKey: "effectiveMaxPatients",
  },
  {
    type: "therapists",
    icon: <UserPlus className="h-5 w-5" />,
    label: "Terapeuci",
    unit: "+1 terapeuta",
    unitAmount: 1,
    priceKey: "therapist1",
    currentKey: "additionalTherapists",
    effectiveKey: "effectiveMaxTherapists",
  },
  {
    type: "clinics",
    icon: <Building2 className="h-5 w-5" />,
    label: "Gabinety",
    unit: "+1 gabinet",
    unitAmount: 1,
    priceKey: "clinic1",
    currentKey: "additionalClinics",
    effectiveKey: "effectiveMaxClinics",
  },
];

export function ResourceAddonsPanel() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; type: string } | null>(null);

  const { data: statusData, loading: statusLoading, refetch, error: statusError } = useQuery<{
    resourceAddonsStatus: ResourceAddonsStatus;
  }>(GET_RESOURCE_ADDONS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  const { data: pricingData, error: pricingError } = useQuery<{
    addonPricing: AddonPricing;
  }>(GET_ADDON_PRICING, {
    errorPolicy: "ignore",
  });

  const [purchaseAddon, { loading: purchasing }] = useMutation(PURCHASE_RESOURCE_ADDON, {
    onCompleted: (data) => {
      if (data.purchaseResourceAddon.success) {
        toast.success(data.purchaseResourceAddon.message);
        refetch();
      } else {
        toast.error(data.purchaseResourceAddon.message);
      }
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const [cancelAddon, { loading: cancelling }] = useMutation(CANCEL_RESOURCE_ADDON, {
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
    purchaseAddon({
      variables: {
        organizationId,
        addonType,
        quantity: 1,
      },
    });
  };

  const handleCancel = (addonType: string) => {
    if (!organizationId) return;
    cancelAddon({
      variables: {
        organizationId,
        addonType,
      },
    });
  };

  // Jeśli backend nie ma jeszcze tych endpointów
  if (statusError || pricingError) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              System dodatkowych zasobów będzie dostępny wkrótce.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const status = statusData?.resourceAddonsStatus;
  const pricing = pricingData?.addonPricing;

  if (!status || !pricing) return null;

  const hasAnyAddons =
    status.additionalPatients > 0 ||
    status.additionalTherapists > 0 ||
    status.additionalClinics > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {hasAnyAddons && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Aktywne rozszerzenia</p>
                  <p className="text-xs text-muted-foreground">
                    Dodatkowy koszt: {status.monthlyAddonsCost.toFixed(0)} zł/mies.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {status.additionalPatients > 0 && (
                  <Badge variant="secondary">+{status.additionalPatients} pacjentów</Badge>
                )}
                {status.additionalTherapists > 0 && (
                  <Badge variant="secondary">+{status.additionalTherapists} terapeutów</Badge>
                )}
                {status.additionalClinics > 0 && (
                  <Badge variant="secondary">+{status.additionalClinics} gabinetów</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addons Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-primary" />
            Rozszerz limity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {addonConfigs.map((config) => {
              const currentAmount = status[config.currentKey] as number;
              const effectiveLimit = status[config.effectiveKey] as number;
              const price = pricing[config.priceKey];
              const hasAddon = currentAmount > 0;

              return (
                <div
                  key={config.type}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    hasAddon ? "border-primary/50 bg-primary/5" : "border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        hasAddon ? "bg-primary/20 text-primary" : "bg-surface-light text-muted-foreground"
                      )}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Limit: {effectiveLimit}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{config.unit}</span>
                      <span className="font-semibold text-primary">{price} zł/mies.</span>
                    </div>

                    {hasAddon ? (
                      <div className="flex items-center gap-2">
                        <Badge className="flex-1 justify-center">
                          +{currentAmount} aktywne
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePurchase(config.type)}
                          disabled={purchasing}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setCancelDialog({ open: true, type: config.type })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handlePurchase(config.type)}
                        disabled={purchasing}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Dodaj
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-light p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p>
                Rozszerzenia są doliczane do miesięcznej subskrypcji. Przy upgrade planu -
                addony są automatycznie dostosowane.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog
        open={cancelDialog?.open}
        onOpenChange={(open) => !open && setCancelDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulować rozszerzenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Rozszerzenie zostanie anulowane na koniec bieżącego okresu rozliczeniowego.
              Twój limit zasobów zostanie zmniejszony.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog && handleCancel(cancelDialog.type)}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              Potwierdź anulowanie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
