import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-tint-muted text-tint',
        secondary: 'bg-fill-tertiary text-label-secondary',
        destructive: 'bg-status-danger-muted text-status-danger',
        outline: 'border-separator text-label-secondary',
        success: 'bg-status-success-muted text-status-success',
        warning: 'bg-status-warning-muted text-status-warning',
        info: 'bg-status-info-muted text-status-info',
        solid: 'bg-tint-fill text-on-tint',
        'overlay-info': 'border-status-info/40 bg-card/95 text-status-info shadow-lg backdrop-blur-md',
        'overlay-success': 'border-status-success/40 bg-card/95 text-status-success shadow-lg backdrop-blur-md',
        'overlay-warning': 'border-status-warning/40 bg-card/95 text-status-warning shadow-lg backdrop-blur-md',
        'overlay-danger': 'border-status-danger/40 bg-card/95 text-status-danger shadow-lg backdrop-blur-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
