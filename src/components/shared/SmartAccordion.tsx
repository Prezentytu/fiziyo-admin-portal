'use client';

import { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface SmartAccordionProps {
  /** Title displayed in the header */
  title: string;
  /** Optional icon to display before title */
  icon?: LucideIcon;
  /** Number of missing critical fields (red, pulsing) */
  criticalMissing?: number;
  /** Number of missing recommended fields (amber, subtle) */
  recommendedMissing?: number;
  /** Number of missing optional fields (gray, almost invisible) */
  optionalMissing?: number;
  /** Whether the accordion is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Content to render inside the accordion */
  children: React.ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Test ID for the accordion */
  testId?: string;
}

/**
 * SmartAccordion - Collapsible section with No-Noise Policy
 *
 * Visual states based on missing field priority:
 * - CRITICAL (red): Pulsing badge, red border - safety/required fields
 * - RECOMMENDED (amber): Subtle badge, no animation - quality improvements
 * - OPTIONAL (gray): Almost invisible badge - nice to have
 *
 * The accordion only "screams" for critical issues, keeping the UI calm
 * for optional/recommended fields.
 */
export function SmartAccordion({
  title,
  icon: Icon,
  criticalMissing = 0,
  recommendedMissing = 0,
  optionalMissing = 0,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  className,
  testId,
}: SmartAccordionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  // Determine the highest priority status
  const status = criticalMissing > 0
    ? 'critical'
    : recommendedMissing > 0
      ? 'recommended'
      : optionalMissing > 0
        ? 'optional'
        : 'complete';

  // Get badge content and styling based on status
  const getBadgeConfig = () => {
    if (criticalMissing > 0) {
      return {
        count: criticalMissing,
        label: criticalMissing === 1 ? 'wymagane' : 'wymagane',
        className: 'animate-pulse bg-red-500/20 text-red-500 border-red-500/30',
      };
    }
    if (recommendedMissing > 0) {
      return {
        count: recommendedMissing,
        label: 'sugerowane',
        className: 'bg-amber-500/10 text-amber-500/70 border-amber-500/20',
      };
    }
    if (optionalMissing > 0) {
      return {
        count: optionalMissing,
        label: 'opcjonalne',
        className: 'bg-surface-light text-muted-foreground/60 border-border/40',
      };
    }
    return null;
  };

  const badgeConfig = getBadgeConfig();

  // Container styling based on status
  const containerClassName = cn(
    'rounded-xl border bg-surface/50 transition-all duration-300',
    {
      'border-red-500/30 shadow-sm shadow-red-500/10': status === 'critical',
      'border-amber-500/20': status === 'recommended',
      'border-border/60': status === 'optional' || status === 'complete',
    },
    className
  );

  // Header text styling based on status
  const headerTextClassName = cn(
    'text-sm font-medium transition-colors duration-300',
    {
      'text-red-500': status === 'critical',
      'text-amber-500/80': status === 'recommended',
      'text-muted-foreground': status === 'optional' || status === 'complete',
    }
  );

  // Icon styling based on status
  const iconClassName = cn(
    'h-4 w-4 transition-colors duration-300',
    {
      'text-red-500': status === 'critical',
      'text-amber-500/80': status === 'recommended',
      'text-muted-foreground': status === 'optional' || status === 'complete',
    }
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={containerClassName}
      data-testid={testId}
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-3 p-4 cursor-pointer hover:bg-surface-light/50 transition-colors rounded-xl"
        data-testid={testId ? `${testId}-trigger` : undefined}
      >
        {/* Icon */}
        {Icon && <Icon className={iconClassName} />}

        {/* Title */}
        <span className={headerTextClassName}>{title}</span>

        {/* Badge (only shown if there are missing fields) */}
        {badgeConfig && (
          <Badge
            variant="outline"
            className={cn('ml-auto mr-2 text-[10px] px-1.5 py-0', badgeConfig.className)}
            data-testid={testId ? `${testId}-badge` : undefined}
          >
            {badgeConfig.count} {badgeConfig.label}
          </Badge>
        )}

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-300',
            isOpen && 'rotate-180',
            !badgeConfig && 'ml-auto'
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="px-4 pb-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
