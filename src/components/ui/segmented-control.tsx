'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

const trackVariants = cva('inline-flex flex-wrap gap-0.5 p-0.5', {
  variants: {
    shape: {
      rounded: 'rounded-[10px] bg-fill-quaternary',
      pill: 'rounded-full bg-fill-tertiary',
    },
  },
  defaultVariants: { shape: 'rounded' },
});

const segmentVariants = cva(
  'text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
  {
    variants: {
      shape: {
        rounded: 'h-[30px] rounded-[8px] px-3',
        pill: 'h-7 rounded-full px-3',
      },
      active: {
        true: 'bg-elevated font-semibold text-foreground shadow-raised',
        false: 'font-medium text-label-secondary hover:text-foreground',
      },
    },
    defaultVariants: { shape: 'rounded', active: false },
  }
);

interface SegmentedControlProps<T extends string | number> extends VariantProps<typeof trackVariants> {
  readonly value: T;
  readonly options: ReadonlyArray<SegmentedOption<T>>;
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly disabled?: boolean;
  readonly className?: string;
  /** Each segment gets `${testId}-${value}-btn`. */
  readonly testId: string;
}

/** A few mutually exclusive values side by side (iOS segmented control). */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled = false,
  shape,
  className,
  testId,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className={cn(trackVariants({ shape }), className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            data-testid={`${testId}-${option.value}-btn`}
            className={segmentVariants({ shape, active: isActive })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
