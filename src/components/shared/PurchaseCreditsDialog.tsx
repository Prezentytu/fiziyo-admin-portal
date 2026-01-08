"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Package,
  Zap,
  Star,
  Check,
  Loader2,
  Key,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  PURCHASE_AI_CREDITS_PACKAGE,
  ADD_CREDITS_WITH_CODE,
} from "@/graphql/mutations/aiCredits.mutations";
import { triggerCreditsRefresh } from "@/components/settings/AICreditsPanel";

// Credit packages configuration
const creditPackages = [
  {
    type: "small" as const,
    credits: 100,
    price: 19,
    perCredit: "0.19",
    icon: Package,
    label: "Starter",
    actions: "~80 czatów lub ~50 zestawów",
  },
  {
    type: "medium" as const,
    credits: 300,
    price: 49,
    perCredit: "0.16",
    icon: Zap,
    label: "Popular",
    popular: true,
    actions: "~250 czatów lub ~150 zestawów",
  },
  {
    type: "large" as const,
    credits: 1000,
    price: 129,
    perCredit: "0.13",
    icon: Star,
    label: "Power",
    best: true,
    actions: "~800 czatów lub ~500 zestawów",
  },
];

interface PurchaseCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string | undefined;
}

export function PurchaseCreditsDialog({
  isOpen,
  onClose,
  organizationId,
}: PurchaseCreditsDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [bypassCode, setBypassCode] = useState("");

  // Stripe purchase mutation
  const [purchasePackage, { loading: purchasing }] = useMutation<{
    purchaseAICreditsPackage: {
      success: boolean;
      checkoutUrl?: string;
      message?: string;
    };
  }>(PURCHASE_AI_CREDITS_PACKAGE, {
    onCompleted: (data) => {
      if (data.purchaseAICreditsPackage.success && data.purchaseAICreditsPackage.checkoutUrl) {
        globalThis.location.href = data.purchaseAICreditsPackage.checkoutUrl;
      } else {
        toast.error(data.purchaseAICreditsPackage.message || "Błąd podczas zakupu");
      }
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  // Bypass purchase mutation
  const [addCreditsWithCode, { loading: bypassPurchasing }] = useMutation<{
    addCreditsWithCode: {
      success: boolean;
      message?: string;
      creditsAdded?: number;
    };
  }>(ADD_CREDITS_WITH_CODE, {
    onCompleted: (data) => {
      if (data.addCreditsWithCode.success) {
        toast.success(data.addCreditsWithCode.message || `Dodano ${data.addCreditsWithCode.creditsAdded} kredytów!`);
        handleClose();
        triggerCreditsRefresh();
      } else {
        toast.error(data.addCreditsWithCode.message || "Błąd podczas aktywacji");
      }
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleClose = () => {
    onClose();
    setSelectedPackage(null);
    setBypassCode("");
  };

  const handlePurchase = () => {
    if (!selectedPackage || !organizationId) return;

    // Jeśli wpisany kod promocyjny - użyj go zamiast Stripe
    if (bypassCode.trim()) {
      addCreditsWithCode({
        variables: {
          organizationId,
          packageType: selectedPackage,
          bypassCode: bypassCode.trim(),
        },
      });
      return;
    }

    // Stripe flow
    purchasePackage({
      variables: {
        organizationId,
        packageType: selectedPackage,
      },
    });
  };

  const isLoading = purchasing || bypassPurchasing;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && handleClose()}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0" onInteractOutside={(e) => isLoading && e.preventDefault()}>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/60">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-bold">Doładuj kredyty AI</DialogTitle>
            <DialogDescription className="text-base">
              Kredyty nie wygasają i są dodawane do Twojego konta
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Packages grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {creditPackages.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackage === pkg.type;

              return (
                <button
                  key={pkg.type}
                  type="button"
                  onClick={() => setSelectedPackage(pkg.type)}
                  disabled={isLoading}
                  data-testid={`ai-credits-package-${pkg.type}-btn`}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border-2 p-5 text-left min-h-[320px]",
                    "transition-all duration-300",
                    "hover:-translate-y-2 hover:shadow-2xl cursor-pointer",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                    isSelected
                      ? pkg.best
                        ? "border-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/20"
                        : "border-primary bg-primary/5 shadow-xl shadow-primary/20"
                      : pkg.best
                      ? "border-orange-500/50 hover:border-orange-500 hover:shadow-orange-500/10"
                      : pkg.popular
                      ? "border-primary/50 hover:border-primary hover:shadow-primary/10"
                      : "border-border/60 hover:border-primary/50 hover:shadow-primary/10"
                  )}
                >
                  {/* Badge */}
                  {pkg.best && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg px-3 py-1">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Najlepsza cena
                      </Badge>
                    </div>
                  )}
                  {pkg.popular && !pkg.best && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-emerald-600 text-white border-0 shadow-lg px-3 py-1">
                        Popularne
                      </Badge>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white mb-4 shadow-lg",
                    "transition-transform duration-300 group-hover:scale-110",
                    pkg.best
                      ? "from-orange-500 to-red-500"
                      : pkg.popular
                      ? "from-primary to-emerald-600"
                      : "from-slate-500 to-slate-600"
                  )}>
                    <Icon className="h-7 w-7" />
                  </div>

                  {/* Credits */}
                  <h3 className={cn(
                    "text-4xl font-bold",
                    pkg.best ? "text-orange-500" : pkg.popular ? "text-primary" : "text-foreground"
                  )}>
                    {pkg.credits}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">kredytów</p>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-2xl font-bold",
                        pkg.best ? "text-orange-500" : "text-foreground"
                      )}>
                        {pkg.price}
                      </span>
                      <span className="text-base text-muted-foreground">zł</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{pkg.perCredit} zł/kredyt</p>
                  </div>

                  {/* Actions info */}
                  <p className="text-xs text-muted-foreground flex-1">{pkg.actions}</p>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center",
                        pkg.best ? "bg-orange-500" : "bg-primary"
                      )}>
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Promo code section - minimalist */}
          <div className="mt-6 flex items-center gap-3">
            <Key className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Kod promocyjny (opcjonalnie)"
              value={bypassCode}
              onChange={(e) => setBypassCode(e.target.value)}
              disabled={isLoading}
              className="bg-surface border-border/60 h-9 text-sm"
              data-testid="ai-credits-dialog-promo-code-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-border/60">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Anuluj
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedPackage || isLoading}
            data-testid="ai-credits-dialog-purchase-btn"
            className={cn(
              "gap-2 min-w-[120px]",
              selectedPackage === "large"
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isLoading ? (
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
      </DialogContent>
    </Dialog>
  );
}
