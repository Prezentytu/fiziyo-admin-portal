import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold cursor-pointer transition-[background-color,color,opacity] duration-150 active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[17px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-tint-fill text-on-tint hover:bg-tint-fill-hover',
        tinted: 'bg-tint-muted text-tint hover:bg-tint-muted/70',
        destructive: 'bg-status-danger-fill text-on-tint hover:bg-status-danger-fill/90',
        outline: 'border border-separator bg-transparent text-foreground hover:bg-fill-quaternary',
        secondary: 'bg-fill-tertiary text-foreground hover:bg-fill-tertiary/70',
        ghost: 'text-foreground hover:bg-fill-quaternary',
        plain: 'text-tint hover:bg-tint-muted',
        link: 'text-tint underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-4',
        lg: 'h-[52px] px-6 text-[17px]',
        icon: "h-9 w-9 after:absolute after:-inset-1 after:content-['']",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
