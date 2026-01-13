"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isPremiumActive, formatPremiumExpiry } from "@/hooks/usePatientPremium";

// ========================================
// Types
// ========================================

interface PremiumStatusBadgeProps {
  /** Data wygaśnięcia Premium (ISO string) */
  premiumActiveUntil: string | null | undefined;
  /** ID pacjenta (dla data-testid) */
  patientId: string;
  /** Callback do aktywacji Premium */
  onActivate?: () => void;
  /** Czy aktywacja jest w trakcie */
  isActivating?: boolean;
  /** Czy pokazać przycisk aktywacji (tylko gdy nieaktywny) */
  showActivateButton?: boolean;
  /** Rozmiar badge'a */
  size?: "sm" | "default";
  /** Dodatkowe klasy CSS */
  className?: string;
}

// ========================================
// Component
// ========================================

/**
 * Badge wyświetlający status Premium pacjenta
 *
 * - 🟢 Aktywny - gdy premiumActiveUntil > now
 * - 🔴 Nieaktywny - gdy brak lub wygasł
 * - Tooltip z datą wygaśnięcia
 * - Opcjonalny przycisk aktywacji
 *
 * @example
 * ```tsx
 * <PremiumStatusBadge
 *   premiumActiveUntil={patient.premiumActiveUntil}
 *   patientId={patient.id}
 *   onActivate={() => initiateActivation(patient.id, patient.fullname)}
 *   isActivating={isActivating}
 *   showActivateButton={true}
 * />
 * ```
 */
export function PremiumStatusBadge({
  premiumActiveUntil,
  patientId,
  onActivate,
  isActivating = false,
  showActivateButton = true,
  size = "default",
  className,
}: PremiumStatusBadgeProps) {
  const isActive = isPremiumActive(premiumActiveUntil);
  const expiryDate = formatPremiumExpiry(premiumActiveUntil);

  const badgeContent = (
    <Badge
      variant={isActive ? "success" : "secondary"}
      className={cn(
        "gap-1 shrink-0 cursor-default",
        size === "sm" && "text-[10px] px-1.5 py-0",
        className
      )}
      data-testid={`patient-premium-badge-${patientId}`}
    >
      <Sparkles className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
      {isActive ? "Aktywny" : "Nieaktywny"}
    </Badge>
  );

  // Jeśli aktywny - pokaż badge z tooltipem z datą wygaśnięcia
  if (isActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Wygasa: {expiryDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Jeśli nieaktywny i bez przycisku aktywacji
  if (!showActivateButton || !onActivate) {
    return badgeContent;
  }

  // Jeśli nieaktywny z przyciskiem aktywacji
  return (
    <div className="flex items-center gap-2">
      {badgeContent}
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        disabled={isActivating}
        data-testid={`patient-premium-activate-btn-${patientId}`}
      >
        <Sparkles className="h-3 w-3" />
        {isActivating ? "Aktywacja..." : "Aktywuj (30 dni)"}
      </Button>
    </div>
  );
}
