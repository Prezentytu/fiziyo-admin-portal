'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, CreditCard } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PremiumAccessManagementAction, PremiumAccessUpdatePayload } from '@/hooks/usePatientPremium';

// ========================================
// Types
// ========================================

interface ActivatePremiumDialogProps {
  /** Czy dialog jest otwarty */
  readonly open: boolean;
  /** Callback zamknięcia dialogu */
  readonly onOpenChange: (open: boolean) => void;
  /** Nazwa pacjenta (dla personalizacji komunikatu) */
  readonly patientName?: string;
  /** Obecny termin Premium (dla podsumowania) */
  readonly currentPremiumValidUntil?: string | null;
  /** Callback potwierdzenia aktywacji/przedłużenia */
  readonly onConfirm: (payload: PremiumAccessUpdatePayload) => void;
  /** Callback anulowania */
  readonly onCancel?: () => void;
  /** Czy aktywacja jest w trakcie */
  readonly isLoading?: boolean;
}

// ========================================
// Component
// ========================================

/**
 * Dialog potwierdzenia aktywacji/przedłużenia Premium z wyborem okresu
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
  currentPremiumValidUntil,
  onConfirm,
  onCancel,
  isLoading = false,
}: ActivatePremiumDialogProps) {
  const [action, setAction] = useState<PremiumAccessManagementAction>('ExtendByDuration');
  const [durationDays, setDurationDays] = useState<string>('');
  const [targetExpiry, setTargetExpiry] = useState<string>('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setAction('ExtendByDuration');
      setDurationDays('');
      setTargetExpiry('');
      setReason('');
    }
  }, [open]);

  const currentEndDate = useMemo(() => {
    if (!currentPremiumValidUntil) return null;
    const parsedDate = new Date(currentPremiumValidUntil);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate;
  }, [currentPremiumValidUntil]);

  const extensionStartDate = useMemo(() => {
    if (!currentEndDate) return new Date();
    const now = new Date();
    return new Date(Math.max(currentEndDate.getTime(), now.getTime()));
  }, [currentEndDate]);

  const selectedDurationDays = durationDays ? Number.parseInt(durationDays, 10) : null;
  const selectedTargetExpiry = useMemo(() => {
    if (!targetExpiry) return null;
    return new Date(`${targetExpiry}T00:00:00Z`);
  }, [targetExpiry]);
  const nextPremiumDate = useMemo(() => {
    if (action === 'ExtendByDuration') {
      return selectedDurationDays ? addDays(extensionStartDate, selectedDurationDays) : null;
    }
    if (action === 'SetExactExpiry') {
      if (!selectedTargetExpiry || Number.isNaN(selectedTargetExpiry.getTime())) return null;
      return selectedTargetExpiry;
    }

    return new Date();
  }, [action, extensionStartDate, selectedDurationDays, selectedTargetExpiry]);

  const isReasonRequired = action !== 'ExtendByDuration';
  const hasValidReason = reason.trim().length >= 5;
  const canConfirm = action === 'ExtendByDuration'
    ? !!selectedDurationDays
    : action === 'SetExactExpiry'
      ? !!selectedTargetExpiry && hasValidReason
      : hasValidReason;

  const handleConfirm = () => {
    if (!canConfirm) return;

    const payload: PremiumAccessUpdatePayload =
      action === 'ExtendByDuration'
        ? { action, durationDays: selectedDurationDays ?? undefined }
        : action === 'SetExactExpiry'
          ? {
              action,
              targetExpiry: selectedTargetExpiry?.toISOString(),
              reason: reason.trim(),
            }
          : {
              action,
              reason: reason.trim(),
            };

    onConfirm(payload);
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
              Zarządzaj dostępem Premium
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {patientName ? (
                  <>
                    Zamierzasz zmienić dostęp Premium dla pacjenta{' '}
                    <span className="font-medium text-foreground">{patientName}</span>.
                  </>
                ) : (
                  'Zamierzasz zmienić dostęp Premium dla pacjenta.'
                )}
              </p>
              <div className="space-y-2">
                <Label>Co chcesz zrobić?</Label>
                <Select value={action} onValueChange={(next) => setAction(next as PremiumAccessManagementAction)}>
                  <SelectTrigger data-testid="patient-premium-action-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ExtendByDuration">Przedłuż o okres</SelectItem>
                    <SelectItem value="SetExactExpiry">Ustaw dokładną datę wygaśnięcia</SelectItem>
                    <SelectItem value="RevokeNow">Cofnij dostęp teraz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {action === 'ExtendByDuration' && (
              <div className="space-y-2">
                <Label>Na jak długo przedłużyć dostęp?</Label>
                <Select value={durationDays} onValueChange={setDurationDays}>
                  <SelectTrigger data-testid="patient-premium-duration-select">
                    <SelectValue placeholder="Wybierz okres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 tydzień</SelectItem>
                    <SelectItem value="14">2 tygodnie</SelectItem>
                    <SelectItem value="30">1 miesiąc</SelectItem>
                    <SelectItem value="60">2 miesiące</SelectItem>
                    <SelectItem value="90">3 miesiące</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              )}

              {action === 'SetExactExpiry' && (
                <div className="space-y-2">
                  <Label>Nowa data wygaśnięcia</Label>
                  <Input
                    type="date"
                    value={targetExpiry}
                    onChange={(event) => setTargetExpiry(event.target.value)}
                    data-testid="patient-premium-target-expiry-input"
                  />
                </div>
              )}

              <div className="rounded-lg border border-border/60 bg-surface-light p-3 text-xs">
                <p>
                  Obecny termin:{' '}
                  <span className="font-medium text-foreground">
                    {currentEndDate ? format(currentEndDate, 'd MMM yyyy', { locale: pl }) : 'brak aktywnego Premium'}
                  </span>
                </p>
                <p>
                  Nowy termin:{' '}
                  <span className="font-medium text-foreground">
                    {nextPremiumDate ? format(nextPremiumDate, 'd MMM yyyy', { locale: pl }) : 'wybierz okres'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-light border border-border/60">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm">
                  Do Twojego miesięcznego rachunku zostanie doliczonych{' '}
                  <span className="font-semibold text-primary">15 PLN</span>.
                </p>
              </div>
              {isReasonRequired && (
                <div className="space-y-2">
                  <Label>Powód zmiany</Label>
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Opisz krótko powód korekty dostępu"
                    data-testid="patient-premium-reason-textarea"
                  />
                  <p className="text-xs">Wymagane minimum 5 znaków.</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Operacja zostanie wykonana dopiero po potwierdzeniu.</p>
            </div>
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
            disabled={isLoading || !canConfirm}
            className={cn(buttonVariants({ variant: 'default' }))}
            data-testid="patient-premium-confirm-dialog-confirm-btn"
          >
            {isLoading ? (
              'Zapisywanie...'
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Zapisz zmiany
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
