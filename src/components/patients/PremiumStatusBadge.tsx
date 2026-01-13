"use client";

import { Sparkles, Unlock, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isPremiumActive, formatPremiumExpiry, getDaysUntilExpiry } from "@/hooks/usePatientPremium";

// ========================================
// Types
// ========================================

interface PremiumStatusBadgeProps {
  /** Data wygaśnięcia Premium (ISO string) */
  premiumActiveUntil: string | null | undefined;
  /** ID pacjenta (dla data-testid) */
  patientId: string;
  /** Callback do aktywacji/przedłużenia Premium */
  onActivate?: () => void;
  /** Callback do generowania QR kodu (dla shadow users) */
  onGenerateQR?: () => void;
  /** Czy pacjent jest tymczasowy (shadow user) */
  isShadowUser?: boolean;
  /** Czy aktywacja jest w trakcie */
  isActivating?: boolean;
  /** Czy pokazać przycisk akcji */
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
 * Badge wyświetlający status Premium pacjenta z ulepszoną narracją
 *
 * - Aktywny: Zielony badge "Premium (X dni)" + hover "Przedłuż"
 * - Nieaktywny: Przycisk "Odblokuj dostęp"
 * - Shadow User: Przycisk "Generuj QR"
 */
export function PremiumStatusBadge({
  premiumActiveUntil,
  patientId,
  onActivate,
  onGenerateQR,
  isShadowUser = false,
  isActivating = false,
  showActivateButton = true,
  size = "default",
  className,
}: PremiumStatusBadgeProps) {
  const isActive = isPremiumActive(premiumActiveUntil);
  const expiryDate = formatPremiumExpiry(premiumActiveUntil);
  const daysLeft = getDaysUntilExpiry(premiumActiveUntil);

  // For shadow users without premium - show QR button
  if (isShadowUser && !isActive && onGenerateQR) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "gap-1.5 hover:bg-info/10 hover:text-info hover:border-info/30",
          size === "sm" && "h-7 px-2 text-xs"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onGenerateQR();
        }}
        data-testid={`patient-premium-qr-btn-${patientId}`}
      >
        <QrCode className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />
        Generuj QR
      </Button>
    );
  }

  // Active Premium - show badge with days left, extend on hover
  if (isActive) {
    const daysText = daysLeft === 1 ? "1 dzień" : `${daysLeft} dni`;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group/premium relative">
              {/* Default state - badge */}
              <Badge
                variant="success"
                className={cn(
                  "gap-1 shrink-0 cursor-pointer transition-all",
                  size === "sm" && "text-[10px] px-1.5 py-0",
                  showActivateButton && onActivate && "group-hover/premium:opacity-0",
                  className
                )}
                data-testid={`patient-premium-badge-${patientId}`}
                onClick={(e) => {
                  if (onActivate && showActivateButton) {
                    e.stopPropagation();
                    onActivate();
                  }
                }}
              >
                <Sparkles className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
                Premium ({daysText})
              </Badge>
              
              {/* Hover state - extend button */}
              {showActivateButton && onActivate && (
                <Button
                  variant="default"
                  size="sm"
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover/premium:opacity-100 transition-opacity gap-1",
                    size === "sm" && "h-auto px-1.5 py-0 text-[10px]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivate();
                  }}
                  disabled={isActivating}
                  data-testid={`patient-premium-extend-btn-${patientId}`}
                >
                  <Sparkles className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
                  {isActivating ? "..." : "Przedłuż"}
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Wygasa: {expiryDate}</p>
            {showActivateButton && <p className="text-xs text-muted-foreground">Kliknij aby przedłużyć</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inactive Premium - show unlock button or badge
  if (!showActivateButton || !onActivate) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "gap-1 shrink-0 cursor-default",
          size === "sm" && "text-[10px] px-1.5 py-0",
          className
        )}
        data-testid={`patient-premium-badge-${patientId}`}
      >
        <Sparkles className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
        Brak dostępu
      </Badge>
    );
  }

  // Inactive with button - "Odblokuj dostęp"
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30",
        size === "sm" && "h-7 px-2 text-xs"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      disabled={isActivating}
      data-testid={`patient-premium-activate-btn-${patientId}`}
    >
      <Unlock className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />
      {isActivating ? "Aktywacja..." : "Odblokuj dostęp"}
    </Button>
  );
}
