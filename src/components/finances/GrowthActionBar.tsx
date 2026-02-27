'use client';

import { useState } from 'react';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientInviteDialog } from './PatientInviteDialog';
import { toast } from 'sonner';
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

  // Handle invite action
  const handleInvite = async () => {
    // Prepare share data for mobile
    const shareData = {
      title: 'Plan ćwiczeń od FiziYo',
      text: 'Cześć! Tu Twój fizjoterapeuta. Przesyłam Twój plan ćwiczeń. Pierwszy miesiąc masz w cenie wizyty!',
      url: 'https://fiziyo.pl/start', // Default URL, will be personalized in dialog
    };

    // Check if native share is available (mobile)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Udostępniono!');
      } catch (error) {
        // User cancelled or error - open dialog as fallback
        if ((error as Error).name !== 'AbortError') {
          setDialogOpen(true);
        }
      }
    } else {
      // Desktop: open dialog
      setDialogOpen(true);
    }
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
            <p className="text-foreground text-base font-semibold tracking-tight">Zwiększ swoje zarobki zapraszając pacjentów</p>
            <p className="text-xs text-muted-foreground mt-0.5">Każdy pacjent Premium = prowizja dla Ciebie</p>
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
