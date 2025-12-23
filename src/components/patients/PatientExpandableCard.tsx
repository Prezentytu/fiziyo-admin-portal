'use client';

import { useRouter } from 'next/navigation';
import { Mail, Phone, FolderKanban, Wrench, MoreHorizontal, Power, UserX } from 'lucide-react';
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
  assignedAt?: string;
}

interface PatientExpandableCardProps {
  patient: Patient;
  onAssignSet: (patient: Patient) => void;
  onViewReport: (patient: Patient) => void;
  onToggleStatus: (patient: Patient) => void;
  onRemove: (patient: Patient) => void;
  organizationId: string;
}

export function PatientExpandableCard({
  patient,
  onAssignSet,
  onToggleStatus,
  onRemove,
}: PatientExpandableCardProps) {
  const router = useRouter();

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

  const isActive = patient.assignmentStatus !== 'inactive';

  const handleCardClick = () => {
    router.push(`/patients/${patient.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group rounded-xl border border-border/60 bg-surface transition-all cursor-pointer',
        'hover:bg-surface-light hover:border-primary/30 hover:shadow-md',
        !isActive && 'opacity-60 hover:opacity-100'
      )}
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

        {/* Context Label */}
        {patient.contextLabel && (
          <ColorBadge color={patient.contextColor || '#888888'} size="sm" className="shrink-0">
            {patient.contextLabel}
          </ColorBadge>
        )}

        {/* Status Badge */}
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className="text-[10px] px-2 py-0.5 shrink-0"
        >
          {isActive ? 'Aktywny' : 'Nieaktywny'}
        </Badge>

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* Quick Assign */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={(e) => handleAction(e, () => onAssignSet(patient))}
            title="Przypisz zestaw"
          >
            <FolderKanban className="h-4 w-4" />
          </Button>

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onAssignSet(patient)}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Przypisz zestaw
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStatus(patient)}>
                <Power className="mr-2 h-4 w-4" />
                {isActive ? 'Dezaktywuj' : 'Aktywuj'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRemove(patient)}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Odepnij pacjenta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
