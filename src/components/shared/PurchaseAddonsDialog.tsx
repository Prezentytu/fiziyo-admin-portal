"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Users,
  UserPlus,
  Building2,
  Loader2,
  Key,
  ArrowRight,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ADD_MULTIPLE_ADDONS_WITH_CODE } from "@/graphql/mutations/aiCredits.mutations";
import { triggerCreditsRefresh } from "@/components/settings/AICreditsPanel";

// Addon configurations
const addonConfigs = [
  {
    type: "patients" as const,
    icon: Users,
    label: "Pacjenci",
    unit: "+10",
    unitValue: 10,
    price: 25,
    description: "Zwiększ limit pacjentów o 10",
  },
  {
    type: "therapists" as const,
    icon: UserPlus,
    label: "Terapeuci",
    unit: "+1",
    unitValue: 1,
    price: 35,
    description: "Dodaj kolejnego terapeutę",
  },
  {
    type: "clinics" as const,
    icon: Building2,
    label: "Gabinety",
    unit: "+1",
    unitValue: 1,
    price: 29,
    description: "Dodaj kolejny gabinet",
  },
];

interface PurchaseAddonsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string | undefined;
  initialAddonType?: "patients" | "therapists" | "clinics";
  onSuccess?: () => void;
}

interface AddonQuantities {
  patients: number;
  therapists: number;
  clinics: number;
}

export function PurchaseAddonsDialog({
  isOpen,
  onClose,
  organizationId,
  initialAddonType,
  onSuccess,
}: PurchaseAddonsDialogProps) {
  const [quantities, setQuantities] = useState<AddonQuantities>({
    patients: 0,
    therapists: 0,
    clinics: 0,
  });
  const [promoCode, setPromoCode] = useState("");

  // Set initial addon when dialog opens
  useEffect(() => {
    if (isOpen && initialAddonType) {
      setQuantities(prev => ({
        ...prev,
        [initialAddonType]: 1,
      }));
    }
  }, [isOpen, initialAddonType]);

  // Mutation for adding multiple addons
  const [addMultipleAddons, { loading }] = useMutation<{
    addMultipleAddonsWithCode: {
      success: boolean;
      message?: string;
      addedPatients?: number;
      addedTherapists?: number;
      addedClinics?: number;
    };
  }>(ADD_MULTIPLE_ADDONS_WITH_CODE, {
    onCompleted: (data) => {
      if (data.addMultipleAddonsWithCode.success) {
        toast.success(data.addMultipleAddonsWithCode.message || "Rozszerzenia zostały dodane!");
        handleClose();
        triggerCreditsRefresh();
        onSuccess?.();
      } else {
        toast.error(data.addMultipleAddonsWithCode.message || "Błąd podczas dodawania rozszerzeń");
      }
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleClose = () => {
    onClose();
    setQuantities({ patients: 0, therapists: 0, clinics: 0 });
    setPromoCode("");
  };

  const handlePurchase = () => {
    if (!organizationId) return;

    // Jeśli wpisany kod promocyjny - użyj go
    if (promoCode.trim()) {
      addMultipleAddons({
        variables: {
          organizationId,
          patients: quantities.patients,
          therapists: quantities.therapists,
          clinics: quantities.clinics,
          promoCode: promoCode.trim(),
        },
      });
      return;
    }

    // TODO: Stripe flow - na razie wymagamy kodu
    toast.error("Płatności Stripe będą dostępne wkrótce. Użyj kodu promocyjnego.");
  };

  const updateQuantity = (type: keyof AddonQuantities, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(10, prev[type] + delta)),
    }));
  };

  const toggleAddon = (type: keyof AddonQuantities, checked: boolean) => {
    setQuantities(prev => ({
      ...prev,
      [type]: checked ? 1 : 0,
    }));
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    return addonConfigs.reduce((sum, config) => {
      return sum + quantities[config.type] * config.price;
    }, 0);
  }, [quantities]);

  const hasSelection = quantities.patients > 0 || quantities.therapists > 0 || quantities.clinics > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0" onInteractOutside={(e) => loading && e.preventDefault()}>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/60">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold">Rozszerzenia zasobów</DialogTitle>
            <DialogDescription>
              Zwiększ limity swojego planu
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Addon list */}
        <div className="p-6 space-y-4">
          {addonConfigs.map((config) => {
            const Icon = config.icon;
            const quantity = quantities[config.type];
            const isSelected = quantity > 0;

            return (
              <div
                key={config.type}
                className={cn(
                  "rounded-xl border p-4 transition-all duration-200",
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-border/60 hover:border-border"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    id={`addon-${config.type}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => toggleAddon(config.type, !!checked)}
                    disabled={loading}
                    className="h-5 w-5"
                    data-testid={`addon-${config.type}-checkbox`}
                  />

                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                    isSelected
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                      : "bg-surface-light"
                  )}>
                    <Icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-muted-foreground")} />
                  </div>

                  {/* Content */}
                  <label
                    htmlFor={`addon-${config.type}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{config.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {config.unit} • {config.price} zł/mies.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Quantity controls */}
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(config.type, -1)}
                        disabled={loading || quantity <= 1}
                        data-testid={`addon-${config.type}-minus-btn`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(config.type, 1)}
                        disabled={loading || quantity >= 10}
                        data-testid={`addon-${config.type}-plus-btn`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Summary for selected */}
                {isSelected && quantity > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {config.label}: +{quantity * config.unitValue} {config.type === "patients" ? "pacjentów" : config.type === "therapists" ? "terapeutów" : "gabinetów"}
                    </span>
                    <span className="font-medium text-cyan-500">
                      {quantity * config.price} zł/mies.
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Promo code section */}
          <div className="flex items-center gap-3 pt-2">
            <Key className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Kod promocyjny (opcjonalnie)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              disabled={loading}
              className="bg-surface border-border/60 h-9 text-sm"
              data-testid="addons-dialog-promo-code-input"
            />
          </div>
        </div>

        {/* Footer with total */}
        <div className="border-t border-border/60">
          {/* Total price */}
          <div className="px-6 py-4 flex items-center justify-between bg-surface-light/30">
            <span className="text-sm text-muted-foreground">Suma miesięczna</span>
            <span className="text-xl font-bold text-foreground">
              {totalPrice} <span className="text-sm font-normal text-muted-foreground">zł/mies.</span>
            </span>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 p-6 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Anuluj
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!hasSelection || loading}
              className="gap-2 min-w-[120px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              data-testid="addons-dialog-purchase-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                <>
                  Kup
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
