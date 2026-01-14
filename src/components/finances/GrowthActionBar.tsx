"use client";

import { useState } from "react";
import { UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientInviteDialog } from "./PatientInviteDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export function GrowthActionBar({
  organizationId,
  className,
}: GrowthActionBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Handle invite action
  const handleInvite = async () => {
    // Prepare share data for mobile
    const shareData = {
      title: "Plan ćwiczeń od FiziYo",
      text: "Cześć! Tu Twój fizjoterapeuta. Przesyłam Twój plan ćwiczeń. Pierwszy miesiąc masz w cenie wizyty!",
      url: "https://fiziyo.pl/start", // Default URL, will be personalized in dialog
    };

    // Check if native share is available (mobile)
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        toast.success("Udostępniono!");
      } catch (error) {
        // User cancelled or error - open dialog as fallback
        if ((error as Error).name !== "AbortError") {
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
          "w-full flex items-center justify-between px-6 py-4",
          "bg-zinc-900/50 border border-white/5 rounded-xl",
          "hover:border-emerald-500/30 transition-all duration-300",
          "group cursor-pointer",
          className
        )}
      >
        {/* Left side - Icon + Text */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
              <UserPlus className="h-6 w-6 text-emerald-400" />
            </div>
            {/* Sparkle decoration */}
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-white font-medium">
              Zwiększ swoje zarobki zapraszając pacjentów
            </p>
            <p className="text-sm text-zinc-500">
              Każdy pacjent Premium = prowizja dla Ciebie
            </p>
          </div>
        </div>

        {/* Right side - CTA Button */}
        <Button
          variant="ghost"
          className={cn(
            "gap-2 text-zinc-300",
            "group-hover:bg-emerald-500/20 group-hover:text-emerald-400",
            "transition-all duration-300"
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
      <PatientInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}
