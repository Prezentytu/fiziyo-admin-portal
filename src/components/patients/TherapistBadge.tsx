'use client';

import { User, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TherapistInfo {
  id: string;
  fullname?: string;
  email?: string;
  image?: string;
}

interface TherapistBadgeProps {
  therapist?: TherapistInfo | null;
  isCurrentUser?: boolean;
  showUnassigned?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TherapistBadge({
  therapist,
  isCurrentUser = false,
  showUnassigned = true,
  size = 'sm',
  className,
}: TherapistBadgeProps) {
  const avatarSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  // Unassigned state
  if (!therapist) {
    if (!showUnassigned) return null;

    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1.5 px-2 py-0.5 border-warning/40 bg-warning/10 text-warning-foreground',
          textSize,
          className
        )}
        data-testid="patient-card-therapist-badge-unassigned"
      >
        <UserX className="h-3 w-3" />
        <span>Nieprzypisany</span>
      </Badge>
    );
  }

  const displayName = therapist.fullname || therapist.email || 'Fizjoterapeuta';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Current user badge (highlighted)
  if (isCurrentUser) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="default"
              className={cn(
                'gap-1.5 px-2 py-0.5 bg-primary/20 text-primary border-0 hover:bg-primary/30',
                textSize,
                className
              )}
              data-testid="patient-card-therapist-badge"
            >
              <Avatar className={avatarSize}>
                <AvatarImage src={therapist.image} alt={displayName} />
                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">Mój pacjent</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Przypisany do: {displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Other therapist badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              'gap-1.5 px-2 py-0.5 bg-surface-light hover:bg-surface-light/80',
              textSize,
              className
            )}
            data-testid="patient-card-therapist-badge"
          >
            <Avatar className={avatarSize}>
              <AvatarImage src={therapist.image} alt={displayName} />
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[100px]">{displayName}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Przypisany do: {displayName}</p>
          {therapist.email && <p className="text-xs text-muted-foreground">{therapist.email}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
