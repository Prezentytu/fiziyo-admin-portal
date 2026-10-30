import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const choiceChipVariants = cva(
  'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium transition-[background-color,border-color,color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-label-secondary',
  {
    variants: {
      variant: {
        default:
          'border-separator bg-card text-foreground hover:bg-fill-quaternary disabled:opacity-40 disabled:hover:bg-card',
        primary: 'border-tint bg-card text-tint hover:bg-tint-muted disabled:opacity-40 disabled:hover:bg-card',
        chosen: 'border-transparent bg-fill-tertiary text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface ChoiceChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof choiceChipVariants> {
  'data-testid': string;
}

/** Quick reply and shortcut pill: one tap answers the question above it. */
const ChoiceChip = React.forwardRef<HTMLButtonElement, ChoiceChipProps>(
  ({ className, variant, type = 'button', 'data-testid': testId, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-testid={testId}
      className={cn(choiceChipVariants({ variant, className }))}
      {...props}
    />
  )
);
ChoiceChip.displayName = 'ChoiceChip';

export { ChoiceChip, choiceChipVariants };
