"use client";

import { Sparkles, CreditCard } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface ActivatePremiumDialogProps {
  /** Czy dialog jest otwarty */
  open: boolean;
  /** Callback zamknięcia dialogu */
  onOpenChange: (open: boolean) => void;
  /** Nazwa pacjenta (dla personalizacji komunikatu) */
  patientName?: string;
  /** Callback potwierdzenia aktywacji */
  onConfirm: () => void;
  /** Callback anulowania */
  onCancel?: () => void;
  /** Czy aktywacja jest w trakcie */
  isLoading?: boolean;
}

// ========================================
// Component
// ========================================

/**
 * Dialog potwierdzenia aktywacji Premium
 *
 * Wyświetlany przy pierwszej aktywacji w miesiącu, informuje o koszcie:
 * "Aktywacja pacjenta. Do Twojego miesięcznego rachunku doliczono 15 PLN."
 *
 * @example
 * ```tsx
 * <ActivatePremiumDialog
 *   open={showConfirmDialog}
 *   onOpenChange={setShowConfirmDialog}
 *   patientName={activationTarget?.patientName}
 *   onConfirm={confirmActivation}
 *   onCancel={cancelActivation}
 *   isLoading={isActivating}
 * />
 * ```
 */
export function ActivatePremiumDialog({
  open,
  onOpenChange,
  patientName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ActivatePremiumDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="patient-premium-confirm-dialog">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle data-testid="patient-premium-confirm-dialog-title">
              Aktywacja dostępu Premium
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              {patientName ? (
                <>
                  Zamierzasz aktywować dostęp Premium dla pacjenta{" "}
                  <span className="font-medium text-foreground">{patientName}</span> na 30 dni.
                </>
              ) : (
                "Zamierzasz aktywować dostęp Premium dla pacjenta na 30 dni."
              )}
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-light border border-border/60">
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm">
                Do Twojego miesięcznego rachunku zostanie doliczonych{" "}
                <span className="font-semibold text-primary">15 PLN</span>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              To powiadomienie pojawi się tylko raz w miesiącu. Kolejne aktywacje będą wykonywane bez dodatkowego potwierdzenia.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="patient-premium-confirm-dialog-cancel-btn"
          >
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(buttonVariants({ variant: "default" }))}
            data-testid="patient-premium-confirm-dialog-confirm-btn"
          >
            {isLoading ? (
              "Aktywacja..."
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Aktywuj Premium
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
