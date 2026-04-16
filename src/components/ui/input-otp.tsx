'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

const InputOTP = React.forwardRef<React.ComponentRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-50', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
);
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<React.ComponentRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
);
InputOTPGroup.displayName = 'InputOTPGroup';

interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<'div'> {
  index: number;
}

const InputOTPSlot = React.forwardRef<React.ComponentRef<'div'>, InputOTPSlotProps>(
  ({ index, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const slot = inputOTPContext?.slots[index];
    const char = slot?.char;
    const hasFakeCaret = slot?.hasFakeCaret;
    const isActive = slot?.isActive;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-14 w-12 items-center justify-center rounded-xl border border-border bg-input text-xl font-semibold text-foreground shadow-sm transition-all',
          'sm:h-16 sm:w-14 sm:text-2xl',
          isActive && 'z-10 border-primary ring-2 ring-primary/40',
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
          </div>
        )}
      </div>
    );
  }
);
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<React.ComponentRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  ({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
      <Minus className="h-4 w-4 text-muted-foreground" />
    </div>
  )
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
