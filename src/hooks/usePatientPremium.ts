'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { UPDATE_PATIENT_PREMIUM_ACCESS_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';

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
  premiumValidUntil?: string | null;
}

export type PremiumAccessManagementAction = 'ExtendByDuration' | 'SetExactExpiry' | 'RevokeNow';

export interface PremiumAccessUpdatePayload {
  action: PremiumAccessManagementAction;
  durationDays?: number;
  targetExpiry?: string;
  reason?: string;
}

export interface UsePatientPremiumResult {
  /** Rozpocznij proces aktywacji/rozszerzenia Premium */
  initiateActivation: (patientId: string, patientName: string, premiumValidUntil?: string | null) => void;
  /** Potwierdź zarządzanie dostępem po pokazaniu dialogu */
  confirmActivation: (payload: PremiumAccessUpdatePayload) => Promise<void>;
  /** Anuluj aktywację */
  cancelActivation: () => void;
  /** Czy mutacja jest w trakcie wykonywania */
  isActivating: boolean;
  /** Czy pokazać dialog potwierdzenia */
  showConfirmDialog: boolean;
  /** Dane pacjenta do aktywacji (dla dialogu) */
  activationTarget: ActivationTarget | null;
}

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
  if (!premiumActiveUntil) return '';
  const date = new Date(premiumActiveUntil);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
 * Hook do zarządzania dostępem Premium pacjenta
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
 * initiateActivation(patientId, patientName, premiumValidUntil);
 *
 * // W dialogu potwierdzenia
 * <ActivatePremiumDialog
 *   open={showConfirmDialog}
 *   patientName={activationTarget?.patientName}
 *   onConfirm={(payload) => confirmActivation(payload)}
 *   onCancel={cancelActivation}
 *   isLoading={isActivating}
 * />
 * ```
 */
export function usePatientPremium({ organizationId, onSuccess }: UsePatientPremiumOptions): UsePatientPremiumResult {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activationTarget, setActivationTarget] = useState<ActivationTarget | null>(null);

  const [updatePremiumAccessMutation, { loading: isActivating }] = useMutation(UPDATE_PATIENT_PREMIUM_ACCESS_MUTATION, {
    refetchQueries: [
      {
        query: GET_ORGANIZATION_PATIENTS_QUERY,
        variables: { organizationId, filter: 'all' },
      },
    ],
    onCompleted: () => {
      toast.success('Dostęp Premium został zaktualizowany');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Błąd aktualizacji dostępu: ${error.message}`);
    },
  });

  /**
   * Wykonaj zarządzanie dostępem Premium
   */
  const executePremiumAccessUpdate = useCallback(
    async (patientId: string, payload: PremiumAccessUpdatePayload) => {
      await updatePremiumAccessMutation({
        variables: {
          patientId,
          organizationId,
          action: payload.action,
          durationDays: payload.durationDays ?? null,
          targetExpiry: payload.targetExpiry ?? null,
          reason: payload.reason ?? null,
        },
      });
    },
    [organizationId, updatePremiumAccessMutation]
  );

  /** Rozpocznij proces aktywacji/przedłużenia - zawsze wymagamy dialogu potwierdzenia */
  const initiateActivation = useCallback(
    (patientId: string, patientName: string, premiumValidUntil?: string | null) => {
      setActivationTarget({ patientId, patientName, premiumValidUntil });
      setShowConfirmDialog(true);
    },
    []
  );

  /**
   * Potwierdź zarządzanie dostępem po dialogu
   */
  const confirmActivation = useCallback(async (payload: PremiumAccessUpdatePayload) => {
    if (!activationTarget) return;

    setShowConfirmDialog(false);

    await executePremiumAccessUpdate(activationTarget.patientId, payload);
    setActivationTarget(null);
  }, [activationTarget, executePremiumAccessUpdate]);

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
