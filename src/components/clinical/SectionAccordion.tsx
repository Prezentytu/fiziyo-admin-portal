'use client';

import { ReactNode } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SectionAccordionProps {
  title: string;
  icon: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isComplete?: boolean;
  hasContent?: boolean;
  children: ReactNode;
  className?: string;
}

export function SectionAccordion({
  title,
  icon,
  isOpen,
  onOpenChange,
  isComplete = false,
  hasContent = false,
  children,
  className,
}: SectionAccordionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className={className}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200',
            isOpen
              ? 'bg-surface border-primary/30 shadow-sm'
              : 'bg-surface/50 border-border/40 hover:bg-surface hover:border-border/60'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                isComplete
                  ? 'bg-primary/20 text-primary'
                  : hasContent
                  ? 'bg-warning/20 text-warning'
                  : 'bg-surface-light text-muted-foreground'
              )}
            >
              {icon}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{title}</span>
              {isComplete && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              )}
              {!isComplete && hasContent && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20">
                  <AlertCircle className="h-3 w-3 text-warning" />
                </div>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="rounded-xl border border-border/40 bg-surface/30 p-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

