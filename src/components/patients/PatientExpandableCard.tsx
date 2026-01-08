'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, FolderKanban, Wrench, MoreHorizontal, UserX, Tag, UserPlus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColorBadge } from '@/components/shared/ColorBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EditContextLabelDialog } from './EditContextLabelDialog';
import { TherapistBadge } from './TherapistBadge';
import { useRoleAccess } from '@/hooks/useRoleAccess';

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
}

interface PatientExpandableCardProps {
  patient: Patient;
  onAssignSet: (patient: Patient) => void;
  /** @deprecated Click on card navigates to patient details */
  onViewReport?: (patient: Patient) => void;
  /** Odpięcie pacjenta od fizjoterapeuty - tylko Admin/Owner */
  onUnassign: (patient: Patient) => void;
  /** Usunięcie pacjenta z organizacji - tylko Admin/Owner */
  onRemoveFromOrganization: (patient: Patient) => void;
  onTakeOver?: (patient: Patient) => void;
  organizationId: string;
  therapistId: string;
  /** Show therapist badge (Collaborative Care mode) */
  showTherapistBadge?: boolean;
}

export function PatientExpandableCard({
  patient,
  onAssignSet,
  onUnassign,
  onRemoveFromOrganization,
  onTakeOver,
  organizationId,
  therapistId,
  showTherapistBadge = false,
}: PatientExpandableCardProps) {
  const router = useRouter();
  const [isEditLabelOpen, setIsEditLabelOpen] = useState(false);
  const { canManageTeam } = useRoleAccess();

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
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        role="button"
        tabIndex={0}
        className={cn(
          'group rounded-xl border border-border/60 bg-surface transition-all cursor-pointer',
          'hover:bg-surface-light hover:border-primary/30 hover:shadow-md'
        )}
        data-testid={`patient-expandable-${patient.id}`}
      >
        <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              'h-11 w-11 ring-2 transition-all',
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
                  ? 'bg-muted-foreground/60 text-white'
                  : 'bg-gradient-to-br from-info to-blue-600 text-white'
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {patient.isShadowUser && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-surface">
              <Wrench className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                Tymczasowy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {patient.email && (
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{patient.email}</span>
              </span>
            )}
            {patient.contactData?.phone && (
              <span className="flex items-center gap-1 shrink-0">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {patient.contactData.phone}
              </span>
            )}
          </div>
        </div>

        {/* Therapist Badge (Collaborative Care) */}
        {showTherapistBadge && (
          <TherapistBadge
            therapist={patient.therapist}
            isCurrentUser={isMyPatient}
            showUnassigned={true}
          />
        )}

        {/* Context Label - clickable to edit, hide default "Leczenie podstawowe" */}
        {isMyPatient && patient.contextLabel && patient.contextLabel !== 'Leczenie podstawowe' ? (
          <button
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
            className="shrink-0 hover:scale-105 transition-transform"
            title="Kliknij aby edytować"
          >
            <ColorBadge color={patient.contextColor || '#888888'} size="sm">
              {patient.contextLabel}
            </ColorBadge>
          </button>
        ) : isMyPatient ? (
          /* Add note button when no label (only for my patients) */
          <button
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
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Dodaj notatkę"
          >
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 hover:bg-surface-light">
              <Tag className="h-3 w-3" />
              Notatka
            </Badge>
          </button>
        ) : null}

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* Take Over button (only for patients not mine) */}
          {!isMyPatient && onTakeOver && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
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
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => handleAction(e, () => onAssignSet(patient))}
              title="Przypisz zestaw"
              data-testid={`patient-expandable-${patient.id}-assign-btn`}
            >
              <FolderKanban className="h-4 w-4" />
            </Button>
          )}

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
                    Przypisz zestaw
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditLabelOpen(true)}>
                    <Tag className="mr-2 h-4 w-4" />
                    Edytuj notatkę
                  </DropdownMenuItem>
                </>
              )}

              {/* Admin/Owner actions */}
              {canManageTeam && (
                <>
                  <DropdownMenuSeparator />
                  {/* Unassign from therapist - only if patient has a therapist */}
                  {hasTherapist && (
                    <DropdownMenuItem
                      onClick={() => onUnassign(patient)}
                      className="text-warning focus:text-warning"
                    >
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
  </>
  );
}
