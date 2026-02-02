"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { ACTIVATE_PATIENT_PREMIUM_MUTATION } from "@/graphql/mutations/users.mutations";
import { GET_ORGANIZATION_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";

// ========================================
// Types
// ========================================

interface UsePatientPremiumOptions {
  organizationId: string;
  /** Callback wywoływany po pomyślnej aktywacji */
  onSuccess?: () => void;
}

interface ActivationTarget {
  patientId: string;
  patientName: string;
}

export interface UsePatientPremiumResult {
  /** Rozpocznij proces aktywacji Premium (może pokazać dialog potwierdzenia) */
  initiateActivation: (patientId: string, patientName: string) => void;
  /** Potwierdź aktywację po pokazaniu dialogu */
  confirmActivation: () => Promise<void>;
  /** Anuluj aktywację */
  cancelActivation: () => void;
  /** Czy mutacja jest w trakcie wykonywania */
  isActivating: boolean;
  /** Czy pokazać dialog potwierdzenia */
  showConfirmDialog: boolean;
  /** Dane pacjenta do aktywacji (dla dialogu) */
  activationTarget: ActivationTarget | null;
}

// ========================================
// Helpers
// ========================================

/**
 * Generuje klucz localStorage dla śledzenia pierwszej aktywacji w miesiącu
 */
const getMonthKey = (orgId: string): string => {
  const now = new Date();
  return `fiziyo_premium_activation_${orgId}_${now.getFullYear()}_${now.getMonth()}`;
};

/**
 * Sprawdza czy to pierwsza aktywacja w tym miesiącu (pokaż ostrzeżenie o koszcie)
 */
const shouldShowConfirmation = (orgId: string): boolean => {
  if (globalThis.window === undefined) return true;
  const key = getMonthKey(orgId);
  return !localStorage.getItem(key);
};

/**
 * Oznacza że ostrzeżenie zostało już pokazane w tym miesiącu
 */
const markConfirmationShown = (orgId: string): void => {
  if (globalThis.window === undefined) return;
  const key = getMonthKey(orgId);
  localStorage.setItem(key, "true");
};

/**
 * Sprawdza czy Premium jest aktywne
 */
export const isPremiumActive = (premiumActiveUntil: string | null | undefined): boolean => {
  if (!premiumActiveUntil) return false;
  return new Date(premiumActiveUntil) > new Date();
};

/**
 * Formatuje datę wygaśnięcia Premium do wyświetlenia
 */
export const formatPremiumExpiry = (premiumActiveUntil: string | null | undefined): string => {
  if (!premiumActiveUntil) return "";
  const date = new Date(premiumActiveUntil);
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Oblicza liczbę dni do wygaśnięcia Premium
 */
export const getDaysUntilExpiry = (premiumActiveUntil: string | null | undefined): number => {
  if (!premiumActiveUntil) return 0;
  const expiryDate = new Date(premiumActiveUntil);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ========================================
// Hook
// ========================================

/**
 * Hook do zarządzania aktywacją Premium pacjenta
 *
 * @example
 * ```tsx
 * const {
 *   initiateActivation,
 *   confirmActivation,
 *   cancelActivation,
 *   isActivating,
 *   showConfirmDialog,
 *   activationTarget,
 * } = usePatientPremium({ organizationId });
 *
 * // Rozpocznij aktywację
 * initiateActivation(patientId, patientName);
 *
 * // W dialogu potwierdzenia
 * <ActivatePremiumDialog
 *   open={showConfirmDialog}
 *   patientName={activationTarget?.patientName}
 *   onConfirm={confirmActivation}
 *   onCancel={cancelActivation}
 *   isLoading={isActivating}
 * />
 * ```
 */
export function usePatientPremium({
  organizationId,
  onSuccess,
}: UsePatientPremiumOptions): UsePatientPremiumResult {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activationTarget, setActivationTarget] = useState<ActivationTarget | null>(null);

  const [activateMutation, { loading: isActivating }] = useMutation(
    ACTIVATE_PATIENT_PREMIUM_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_ORGANIZATION_PATIENTS_QUERY,
          variables: { organizationId, filter: "all" },
        },
      ],
      onCompleted: () => {
        toast.success("Dostęp Premium został aktywowany na 30 dni");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(`Błąd aktywacji: ${error.message}`);
      },
    }
  );

  /**
   * Wykonaj aktywację Premium
   */
  const executeActivation = useCallback(
    async (patientId: string) => {
      await activateMutation({
        variables: {
          patientId,
          organizationId,
          durationDays: 30,
        },
      });
    },
    [activateMutation, organizationId]
  );

  /**
   * Rozpocznij proces aktywacji - pokaż dialog jeśli to pierwsza aktywacja w miesiącu
   */
  const initiateActivation = useCallback(
    (patientId: string, patientName: string) => {
      setActivationTarget({ patientId, patientName });

      if (shouldShowConfirmation(organizationId)) {
        setShowConfirmDialog(true);
      } else {
        // Bezpośrednia aktywacja bez dialogu (już widziano ostrzeżenie w tym miesiącu)
        executeActivation(patientId);
        setActivationTarget(null);
      }
    },
    [organizationId, executeActivation]
  );

  /**
   * Potwierdź aktywację po dialogu
   */
  const confirmActivation = useCallback(async () => {
    if (!activationTarget) return;

    markConfirmationShown(organizationId);
    setShowConfirmDialog(false);

    await executeActivation(activationTarget.patientId);
    setActivationTarget(null);
  }, [activationTarget, organizationId, executeActivation]);

  /**
   * Anuluj aktywację
   */
  const cancelActivation = useCallback(() => {
    setShowConfirmDialog(false);
    setActivationTarget(null);
  }, []);

  return {
    initiateActivation,
    confirmActivation,
    cancelActivation,
    isActivating,
    showConfirmDialog,
    activationTarget,
  };
}
