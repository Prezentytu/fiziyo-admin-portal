'use client';

import { useState } from 'react';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientInviteDialog } from './PatientInviteDialog';
import { cn } from '@/lib/utils';

// ========================================
// Types
// ========================================

interface GrowthActionBarProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function GrowthActionBar({ organizationId, className }: GrowthActionBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleInvite = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <div
        onClick={handleInvite}
        className={cn(
          'w-full flex items-center justify-between p-4 sm:px-6 sm:py-5',
          'bg-surface border border-border/60 rounded-2xl shadow-sm',
          'hover:border-primary/30 hover:shadow-md transition-all duration-300',
          'group cursor-pointer',
          className
        )}
        data-testid="finances-growth-action-bar"
      >
        {/* Left side - Icon + Text */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            {/* Sparkle decoration */}
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-foreground text-base font-semibold tracking-tight">
              Zaproś pacjenta i aktywuj wzrost przychodów
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Każdy aktywny pacjent Premium zasila środki i przybliża kolejny poziom partnerski.
            </p>
          </div>
        </div>

        {/* Right side - CTA Button */}
        <Button
          variant="ghost"
          className={cn(
            'gap-2 text-muted-foreground font-medium',
            'group-hover:bg-primary/10 group-hover:text-primary',
            'transition-all duration-300'
          )}
          data-testid="finances-growth-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleInvite();
          }}
        >
          Zaproś pacjenta
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Invite Dialog */}
      <PatientInviteDialog open={dialogOpen} onOpenChange={setDialogOpen} organizationId={organizationId} />
    </>
  );
}
