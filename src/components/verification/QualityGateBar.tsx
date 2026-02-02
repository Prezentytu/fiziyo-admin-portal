"use client";

import { useState, useMemo } from "react";
import { Check, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type QualityStatus = "ready" | "warning" | "blocked";

interface QualityGateBarProps {
  /** Krytyczne brakujące pola (blokują publikację) */
  criticalMissing: string[];
  /** Sugerowane brakujące pola (nie blokują, ale warto uzupełnić) */
  recommendedMissing: string[];
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * QualityGateBar - Kompaktowy pasek statusu walidacji
 *
 * 3 stany:
 * - Zielony (ready): "Gotowe do publikacji" - wszystko OK
 * - Żółty (warning): "X pól do uzupełnienia" - nie blokuje, ale są sugestie
 * - Czerwony (blocked): "Brakuje X wymaganych" - blokuje publikację
 *
 * Kliknięcie rozwija listę brakujących pól
 */
export function QualityGateBar({
  criticalMissing,
  recommendedMissing,
  className,
  "data-testid": testId,
}: QualityGateBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine status
  const status: QualityStatus = useMemo(() => {
    if (criticalMissing.length > 0) return "blocked";
    if (recommendedMissing.length > 0) return "warning";
    return "ready";
  }, [criticalMissing.length, recommendedMissing.length]);

  // Status config
  const statusConfig = useMemo(() => {
    switch (status) {
      case "ready":
        return {
          icon: Check,
          text: "Gotowe do publikacji",
          bgClass: "bg-emerald-500/10 border-emerald-500/30",
          textClass: "text-emerald-600",
          iconClass: "text-emerald-500",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          text: `${recommendedMissing.length} ${recommendedMissing.length === 1 ? "pole do uzupełnienia" : "pól do uzupełnienia"}`,
          bgClass: "bg-amber-500/10 border-amber-500/30",
          textClass: "text-amber-600",
          iconClass: "text-amber-500",
        };
      case "blocked":
        return {
          icon: XCircle,
          text: `Brakuje ${criticalMissing.length} ${criticalMissing.length === 1 ? "wymaganego pola" : "wymaganych pól"}`,
          bgClass: "bg-red-500/10 border-red-500/30",
          textClass: "text-red-600",
          iconClass: "text-red-500",
        };
    }
  }, [status, criticalMissing.length, recommendedMissing.length]);

  const StatusIcon = statusConfig.icon;
  const hasDetails = criticalMissing.length > 0 || recommendedMissing.length > 0;

  return (
    <div
      className={cn("rounded-lg border transition-all", statusConfig.bgClass, className)}
      data-testid={testId}
    >
      {/* Main bar */}
      <button
        type="button"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 transition-colors",
          hasDetails && "cursor-pointer hover:bg-black/5"
        )}
        aria-expanded={isExpanded}
        data-testid="quality-gate-toggle"
      >
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", statusConfig.iconClass)} />
          <span className={cn("text-sm font-medium", statusConfig.textClass)}>
            {statusConfig.text}
          </span>
        </div>

        {hasDetails && (
          <div className={cn("transition-transform", statusConfig.textClass)}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-inherit/50">
          {/* Critical missing */}
          {criticalMissing.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide">
                Wymagane
              </span>
              <div className="flex flex-wrap gap-1.5">
                {criticalMissing.map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="text-xs bg-red-500/10 text-red-600 border-red-500/30"
                  >
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommended missing */}
          {recommendedMissing.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                Sugerowane
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recommendedMissing.map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
                  >
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
