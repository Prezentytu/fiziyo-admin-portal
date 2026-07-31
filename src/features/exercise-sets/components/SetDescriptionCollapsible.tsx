'use client';

import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SetDescriptionCollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  testIdPrefix?: string;
  className?: string;
}

export function SetDescriptionCollapsible({
  open,
  onOpenChange,
  value,
  onChange,
  disabled = false,
  placeholder = 'Opisz cel zestawu (np. wzmocnienie mięśnia czworogłowego)...',
  testIdPrefix = 'set-description',
  className,
}: SetDescriptionCollapsibleProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <div className="h-7 flex items-start -mx-1">
        <div className="w-full pr-3 px-1.5 flex items-start">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary pt-0.5 disabled:opacity-60"
              data-testid={`${testIdPrefix}-toggle`}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              {value ? 'Edytuj opis' : 'Dodaj opis'}
            </button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="pb-1 pt-1 -mx-1">
          <div className="w-full pr-3 px-1.5">
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-[68px] min-h-[68px] text-sm resize-none bg-surface border-border placeholder:text-muted-foreground/50 w-full focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
              data-testid={`${testIdPrefix}-input`}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
