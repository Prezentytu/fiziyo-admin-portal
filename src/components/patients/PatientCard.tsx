'use client';

import { MoreVertical, Pencil, Trash2, Eye, Mail, Phone, FolderKanban, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ColorBadge } from '@/components/shared/ColorBadge';

export interface Patient {
  id: string;
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
}

interface PatientCardProps {
  patient: Patient;
  onView?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onAssignSet?: (patient: Patient) => void;
  className?: string;
  compact?: boolean;
}

export function PatientCard({
  patient,
  onView,
  onEdit,
  onDelete,
  onAssignSet,
  className,
  compact = false,
}: PatientCardProps) {
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

  // Compact list view
  if (compact) {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 rounded-xl border border-border bg-card p-3',
          'transition-all duration-200 hover:bg-surface-light hover:border-border-light cursor-pointer',
          className
        )}
        onClick={() => onView?.(patient)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar
            className={cn(
              'h-12 w-12 ring-2 transition-all',
              patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-border/30'
            )}
          >
            <AvatarImage src={patient.image} alt={displayName} />
            <AvatarFallback
              className={cn(
                'font-semibold',
                patient.isShadowUser
                  ? 'bg-muted-foreground/60 text-white'
                  : 'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground'
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {patient.isShadowUser && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-card">
              <Wrench className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{displayName}</p>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Tymczasowy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {patient.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{patient.email}</span>
              </span>
            )}
            {patient.contactData?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {patient.contactData.phone}
              </span>
            )}
          </div>
        </div>

        {/* Context label */}
        {patient.contextLabel && (
          <ColorBadge color={patient.contextColor || '#888888'} size="sm">
            {patient.contextLabel}
          </ColorBadge>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(patient)}>
                <Eye className="mr-2 h-4 w-4" />
                Podgląd
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(patient)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
            )}
            {onAssignSet && (
              <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Przypisz zestaw
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(patient)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Grid card view
  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden',
        'card-interactive cursor-pointer',
        className
      )}
      onClick={() => onView?.(patient)}
    >
      {/* Header with avatar */}
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                className={cn(
                  'h-14 w-14 ring-2 transition-all',
                  patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-border/30'
                )}
              >
                <AvatarImage src={patient.image} alt={displayName} />
                <AvatarFallback
                  className={cn(
                    'text-lg font-semibold',
                    patient.isShadowUser
                      ? 'bg-muted-foreground/60 text-white'
                      : 'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground'
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {patient.isShadowUser && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-card">
                  <Wrench className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base">{displayName}</h3>
              {patient.isShadowUser && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                  Konto tymczasowe
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(patient)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(patient)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onAssignSet && (
                <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Przypisz zestaw
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(patient)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact info */}
      <div className="px-6 pb-4 space-y-2 flex-1">
        {patient.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{patient.email}</span>
          </div>
        )}
        {patient.contactData?.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{patient.contactData.phone}</span>
          </div>
        )}
      </div>

      {/* Footer with context label */}
      {patient.contextLabel && (
        <div className="px-6 py-3 border-t border-border">
          <ColorBadge color={patient.contextColor || '#888888'}>{patient.contextLabel}</ColorBadge>
        </div>
      )}
    </div>
  );
}
