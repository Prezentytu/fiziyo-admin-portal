'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, MoreHorizontal, UserX, Tag, UserPlus, Trash2, Settings, Sparkles, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActivityStatusLabel, InitialsAvatar } from '@/components/shared/page';
import { cn } from '@/lib/utils';
import { getPatientActivityStatus } from './utils/patientActivityStatus';
import { getPatientAccess } from './utils/patientList';

/** Shared with the list header so columns line up (v4 design, table from 1180px). */
export const PATIENT_ROW_GRID =
  'min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,2fr)_minmax(150px,1.1fr)_190px_236px] min-[1180px]:gap-4';

import { EditContextLabelDialog } from './EditContextLabelDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { ActivatePremiumDialog } from './ActivatePremiumDialog';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { usePatientPremium } from '@/hooks/usePatientPremium';

export interface Patient {
  id: string;
  assignmentId?: string; // ID of therapist-patient assignment (for context updates)
  fullname?: string;
  email?: string;
  image?: string;
  isShadowUser?: boolean;
  personalData?: {
    firstName?: string;
    lastName?: string;
  };
  contactData?: {
    phone?: string;
    address?: string;
  };
  assignmentStatus?: string;
  contextLabel?: string;
  contextColor?: string;
  assignedAt?: string;
  // Collaborative Care fields
  therapist?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  } | null;
  // Premium Access (Pay-as-you-go Billing)
  premiumValidUntil?: string;
  premiumActivatedAt?: string;
  premiumStatus?: 'FREE' | 'ACTIVE' | 'EXPIRED';
  // Activity Tracking
  lastActivity?: string;
}

interface PatientExpandableCardProps {
  readonly patient: Patient;
  readonly onAssignSet: (patient: Patient) => void;
  /** Pokaż QR kod / receptę dla pacjenta */
  readonly onShowQR?: (patient: Patient) => void;
  /** Odpięcie pacjenta od fizjoterapeuty - tylko Admin/Owner */
  readonly onUnassign: (patient: Patient) => void;
  /** Usunięcie pacjenta z organizacji - tylko Admin/Owner */
  readonly onRemoveFromOrganization: (patient: Patient) => void;
  readonly onTakeOver?: (patient: Patient) => void;
  readonly organizationId: string;
  readonly therapistId: string;
  /** Show the assigned therapist next to the therapy goal (Collaborative Care mode) */
  readonly showTherapistBadge?: boolean;
  /** Dense rows without the therapy goal line */
  readonly compact?: boolean;
}

export function PatientExpandableCard({
  patient,
  onAssignSet,
  onShowQR,
  onUnassign,
  onRemoveFromOrganization,
  onTakeOver,
  organizationId,
  therapistId,
  showTherapistBadge = false,
  compact = false,
}: PatientExpandableCardProps) {
  const router = useRouter();
  const [isEditLabelOpen, setIsEditLabelOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const { canManageTeam } = useRoleAccess();

  // Premium activation hook
  const { initiateActivation, confirmActivation, cancelActivation, isActivating, showConfirmDialog, activationTarget } =
    usePatientPremium({ organizationId });

  // Check if current user is the assigned therapist
  const isMyPatient = patient.therapist?.id === therapistId;
  // Check if patient is unassigned
  const isUnassigned = !patient.therapist;
  // Check if patient has any therapist assigned
  const hasTherapist = !!patient.therapist;

  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim() ||
    'Nieznany pacjent';

  const activity = getPatientActivityStatus(patient.lastActivity);
  const access = getPatientAccess(patient);
  const goal =
    patient.contextLabel && patient.contextLabel !== 'Leczenie podstawowe' ? patient.contextLabel : 'Brak celu terapii';
  const goalLine =
    showTherapistBadge && !isMyPatient
      ? `${goal} · ${patient.therapist?.fullname ?? 'Bez fizjoterapeuty'}`
      : goal;

  const handleCardClick = () => {
    router.push(`/patients/${patient.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          'group flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-t-[0.5px] border-separator px-3 py-3 transition-colors hover:bg-fill-quaternary min-[1180px]:py-0',
          PATIENT_ROW_GRID,
          compact ? 'min-[1180px]:min-h-[52px]' : 'min-[1180px]:min-h-[68px]'
        )}
        data-testid={`patient-expandable-${patient.id}`}
      >
        <span className="flex min-w-0 flex-[1_1_100%] items-center gap-3 min-[1180px]:flex-auto">
          <InitialsAvatar
            name={displayName}
            imageUrl={patient.image}
            muted={patient.isShadowUser}
            className={compact ? 'h-8 w-8' : 'h-10 w-10'}
          />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <Link
                href={`/patients/${patient.id}`}
                onClick={(event) => event.stopPropagation()}
                className="truncate rounded-sm text-[15px] font-semibold leading-5 text-foreground hover:text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {displayName}
              </Link>
              {patient.isShadowUser && (
                <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-fill-tertiary px-2 text-[12px] font-semibold text-label-secondary">
                  Bez konta
                </span>
              )}
            </span>
            {!compact && <span className="truncate text-[13px] leading-[18px] text-label-secondary">{goalLine}</span>}
          </span>
        </span>

        <ActivityStatusLabel tone={activity.tone} label={activity.label} className="pl-[52px] min-[1180px]:pl-0" />

        <span className="flex items-center">
          {access.kind === 'premium' && (
            <span className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-status-success-muted px-3 text-[13px] font-semibold text-status-success">
              {access.label}
            </span>
          )}
          {access.kind === 'locked' &&
            (isMyPatient ? (
              <Button
                variant="tinted"
                size="sm"
                onClick={(e) => handleAction(e, () => initiateActivation(patient.id, displayName, patient.premiumValidUntil))}
                disabled={isActivating && activationTarget?.patientId === patient.id}
                data-testid={`patient-expandable-${patient.id}-premium-btn`}
              >
                {access.label}
              </Button>
            ) : (
              <span className="text-[13px] font-semibold text-label-secondary">Bez Premium</span>
            ))}
          {access.kind === 'shadow' &&
            (isMyPatient && onShowQR ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleAction(e, () => onShowQR(patient))}
                data-testid={`patient-expandable-${patient.id}-connect-btn`}
              >
                {access.label}
              </Button>
            ) : (
              <span className="text-[13px] font-semibold text-label-secondary">Bez konta w aplikacji</span>
            ))}
        </span>

        <span className="ml-auto flex items-center justify-end gap-1">
          {!isMyPatient && onTakeOver && (
            <Button
              variant="tinted"
              size="sm"
              onClick={(e) => handleAction(e, () => onTakeOver(patient))}
              data-testid="patient-takeover-btn"
            >
              {isUnassigned ? 'Przypisz do mnie' : 'Przejmij opiekę'}
            </Button>
          )}
          {isMyPatient && (
            <Button
              variant="tinted"
              size="sm"
              onClick={(e) => handleAction(e, () => onAssignSet(patient))}
              aria-label={`Przypisz zestaw: ${displayName}`}
              data-testid={`patient-expandable-${patient.id}-assign-btn`}
            >
              Przypisz zestaw
            </Button>
          )}
          {isMyPatient && onShowQR && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => handleAction(e, () => onShowQR(patient))}
              aria-label={`Kod QR do aplikacji: ${displayName}`}
              data-testid={`patient-expandable-${patient.id}-qr-btn`}
            >
              Kod QR
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Więcej opcji: ${displayName}`}
                onClick={(e) => e.stopPropagation()}
                data-testid={`patient-expandable-${patient.id}-menu-trigger`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {/* Take Over option */}
              {!isMyPatient && onTakeOver && (
                <>
                  <DropdownMenuItem onClick={() => onTakeOver(patient)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isUnassigned ? 'Przypisz do mnie' : 'Przejmij opiekę'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Actions for my patients */}
              {isMyPatient && (
                <>
                  <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                    <FolderKanban className="mr-2 h-4 w-4" />
                    Personalizuj i przypisz
                  </DropdownMenuItem>
                  {onShowQR && (
                    <DropdownMenuItem onClick={() => onShowQR(patient)}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Pokaż zalecenia (QR)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => initiateActivation(patient.id, displayName, patient.premiumValidUntil)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {patient.premiumValidUntil && new Date(patient.premiumValidUntil) > new Date()
                      ? 'Zarządzaj Premium'
                      : 'Aktywuj Premium'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditLabelOpen(true)}>
                    <Tag className="mr-2 h-4 w-4" />
                    Edytuj cel terapii
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditPatientOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Ustawienia pacjenta
                  </DropdownMenuItem>
                </>
              )}

              {/* Admin/Owner actions */}
              {canManageTeam && (
                <>
                  <DropdownMenuSeparator />
                  {/* Unassign from therapist - only if patient has a therapist */}
                  {hasTherapist && (
                    <DropdownMenuItem onClick={() => onUnassign(patient)} className="text-warning focus:text-warning">
                      <UserX className="mr-2 h-4 w-4" />
                      Odepnij od fizjoterapeuty
                    </DropdownMenuItem>
                  )}
                  {/* Remove from organization */}
                  <DropdownMenuItem
                    onClick={() => onRemoveFromOrganization(patient)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń z organizacji
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {/* Edit Context Label Dialog - OUTSIDE the clickable card to prevent event issues */}
      <EditContextLabelDialog
        open={isEditLabelOpen}
        onOpenChange={setIsEditLabelOpen}
        assignmentId={patient.assignmentId || ''}
        patientName={displayName}
        currentLabel={patient.contextLabel}
        therapistId={therapistId}
        organizationId={organizationId}
      />

      {/* Edit Patient Dialog */}
      <EditPatientDialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen} patient={patient} />

      {/* Activate Premium Dialog */}
      <ActivatePremiumDialog
        open={showConfirmDialog}
        onOpenChange={(open) => !open && cancelActivation()}
        patientName={activationTarget?.patientName}
        currentPremiumValidUntil={activationTarget?.premiumValidUntil}
        onConfirm={confirmActivation}
        onCancel={cancelActivation}
        isLoading={isActivating}
      />
    </>
  );
}
