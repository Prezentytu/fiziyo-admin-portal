'use client';

import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toFieldHelp, type FieldHelpInput } from '@/utils/fieldHelp';

export function FieldHelpContent({ help }: Readonly<{ help: FieldHelpInput }>) {
  const { summary, points, example } = toFieldHelp(help);

  return (
    <div className="space-y-1.5 py-0.5 text-xs leading-relaxed">
      <p className="font-semibold text-foreground">{summary}</p>
      {points && points.length > 0 ? (
        <ul className="space-y-1">
          {points.map((point) => (
            <li key={`${point.term ?? ''}${point.text}`} className="flex gap-1.5 text-muted-foreground">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>
                {point.term ? <strong className="font-semibold text-foreground">{point.term}:</strong> : null}
                {point.term ? ' ' : null}
                {point.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {example ? (
        <p className="border-t border-hairline pt-1.5 text-muted-foreground">
          <span className="font-semibold text-foreground">Przykład:</span> {example}
        </p>
      ) : null}
    </div>
  );
}

interface FieldHelpTooltipProps {
  /** Field name, used in the accessible name of the icon button. */
  label: string;
  help: FieldHelpInput;
  testId: string;
  className?: string;
}

/** The "i" next to a field label. Needs a `TooltipProvider` above it. */
export function FieldHelpTooltip({ label, help, testId, className }: Readonly<FieldHelpTooltipProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            className
          )}
          aria-label={`Informacja: ${label}`}
          data-testid={testId}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[18rem] px-3 py-2">
        <FieldHelpContent help={help} />
      </TooltipContent>
    </Tooltip>
  );
}
