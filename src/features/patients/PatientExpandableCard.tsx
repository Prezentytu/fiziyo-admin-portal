'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Phone,
  FolderKanban,
  Wrench,
  MoreHorizontal,
  UserX,
  Tag,
  UserPlus,
  Trash2,
  Settings,
  Sparkles,
  Activity,
  QrCode,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Helper: Format activity status
function formatActivityStatus(lastActivity: string | undefined): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  isActive: boolean;
} {
  if (!lastActivity) {
    return { text: 'Brak aktywności', color: 'gray', isActive: false };
  }

  const lastDate = new Date(lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays === 0) {
    if (diffHours < 1) {
      return { text: 'Ćwiczył przed chwilą', color: 'green', isActive: true };
    }
    return { text: 'Ćwiczył dzisiaj', color: 'green', isActive: true };
  }
  if (diffDays === 1) {
    return { text: 'Ćwiczył wczoraj', color: 'green', isActive: true };
  }
  if (diffDays <= 3) {
    return { text: `${diffDays} dni temu`, color: 'yellow', isActive: true };
  }
  if (diffDays <= 7) {
    return { text: `${diffDays} dni temu`, color: 'yellow', isActive: false };
  }
  return { text: `Nieaktywny ${diffDays} dni`, color: 'red', isActive: false };
}
import { EditContextLabelDialog } from './EditContextLabelDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { TherapistBadge } from './TherapistBadge';
import { PremiumStatusBadge } from './PremiumStatusBadge';
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
  /** Show therapist badge (Collaborative Care mode) */
  readonly showTherapistBadge?: boolean;
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

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCardClick = (event: React.MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a, button, [role="button"], [role="menuitem"]')) {
      return;
    }
    router.push(`/patients/${patient.id}`);
  };

  const handleAction = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        role="group"
        aria-label={displayName}
        className={cn(
          'group min-w-0 rounded-sm border border-border bg-card transition-colors duration-150 cursor-pointer',
          'hover:border-primary/40'
        )}
        data-testid={`patient-expandable-${patient.id}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3 p-4">
          {/* Avatar with Contact Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative shrink-0 cursor-help">
                  <Avatar
                    className={cn(
                      'size-10 ring-1',
                      patient.isShadowUser
                        ? 'ring-muted-foreground/20 group-hover:ring-muted-foreground/30'
                        : 'ring-border/30 group-hover:ring-primary/30'
                    )}
                  >
                    <AvatarImage src={patient.image} alt={displayName} />
                    <AvatarFallback
                      className={cn(
                        'font-semibold text-sm',
                        patient.isShadowUser
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-info/10 text-info'
                      )}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {patient.isShadowUser && (
                    <div className="absolute -top-1 -right-1 size-4 rounded-full bg-muted flex items-center justify-center ring-2 ring-card">
                      <Wrench className="size-2.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1.5">
                  <p className="font-medium">{displayName}</p>
                  {patient.email && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {patient.email}
                    </p>
                  )}
                  {patient.contactData?.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {patient.contactData.phone}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Main Content - Name + Diagnosis/Goal */}
          <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-52">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-base font-semibold text-foreground wrap-anywhere">
                <Link
                  href={`/patients/${patient.id}`}
                  data-testid={`patient-expandable-${patient.id}-profile-link`}
                  className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  {displayName}
                </Link>
              </h3>
              {patient.isShadowUser && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  Tymczasowy
                </Badge>
              )}
            </div>
            {/* Diagnosis/Treatment Goal instead of email */}
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {patient.contextLabel && patient.contextLabel !== 'Leczenie podstawowe'
                ? patient.contextLabel
                : 'Brak celu terapii'}
            </p>
          </div>

          {/* Activity Indicator (only for my patients) */}
          {isMyPatient &&
            (() => {
              const activity = formatActivityStatus(patient.lastActivity);
              return (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Activity
                      className={cn(
                        'size-4 shrink-0',
                        activity.color === 'green' && 'text-success',
                        activity.color === 'yellow' && 'text-warning',
                        activity.color === 'red' && 'text-error',
                        activity.color === 'gray' && 'text-muted-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs font-medium wrap-anywhere',
                        activity.color === 'green' && 'text-success',
                        activity.color === 'yellow' && 'text-warning',
                        activity.color === 'red' && 'text-error',
                        activity.color === 'gray' && 'text-muted-foreground'
                      )}
                    >
                      {activity.text}
                    </span>
                  </div>
                </div>
              );
            })()}

          {/* Therapist Badge (Collaborative Care) */}
          {showTherapistBadge && (
            <TherapistBadge therapist={patient.therapist} isCurrentUser={isMyPatient} showUnassigned={true} />
          )}

          {/* Premium Status Badge (only for my patients) */}
          {isMyPatient && (
            <PremiumStatusBadge
              premiumActiveUntil={patient.premiumValidUntil}
              patientId={patient.id}
              onActivate={() => initiateActivation(patient.id, displayName, patient.premiumValidUntil)}
              isShadowUser={patient.isShadowUser}
              isActivating={isActivating && activationTarget?.patientId === patient.id}
              showActivateButton={true}
              size="sm"
            />
          )}

          {/* Edit Diagnosis button (on hover, only for my patients) */}
          {isMyPatient && (
            <button
              data-testid="patientexpandablecard-button-315"
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsEditLabelOpen(true);
              }}
              className="inline-flex min-h-10 items-center rounded-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Edytuj cel terapii"
            >
              <span className="inline-flex items-center gap-2 text-xs">
                <Tag className="h-3 w-3" />
                Cel terapii
              </span>
            </button>
          )}

          {/* Hover Actions */}
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {/* Take Over button (only for patients not mine) */}
            {!isMyPatient && onTakeOver && (
              <Button
                aria-label={isUnassigned ? 'Przypisz do mnie' : 'Przejmij opiekę'}
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={(e) => handleAction(e, () => onTakeOver(patient))}
                title={isUnassigned ? 'Przypisz do mnie' : 'Przejmij opiekę'}
                data-testid={`patient-takeover-btn`}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}

            {/* Quick Assign (only for my patients) */}
            {isMyPatient && (
              <Button
                aria-label="Personalizuj i przypisz"
                variant="outline"
                size="sm"
                className="min-h-10 hover:bg-primary/10 hover:text-primary"
                onClick={(e) => handleAction(e, () => onAssignSet(patient))}
                title="Personalizuj i przypisz"
                data-testid={`patient-expandable-${patient.id}-assign-btn`}
              >
                <FolderKanban className="h-4 w-4" />
                Przypisz plan
              </Button>
            )}

            {/* QR Code(only for my patients) */}
            {isMyPatient && onShowQR && (
              <Button
                aria-label="Pokaż zalecenia (QR)"
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={(e) => handleAction(e, () => onShowQR(patient))}
                title="Pokaż zalecenia (QR)"
                data-testid={`patient-expandable-${patient.id}-qr-btn`}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            )}

            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Opcje pacjenta"
                  title="Opcje pacjenta"
                  variant="ghost"
                  size="icon"
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
          </div>
        </div>
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
