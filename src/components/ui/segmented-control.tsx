'use client';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  readonly value: T;
  readonly options: ReadonlyArray<SegmentedOption<T>>;
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly testId: string;
}

/** A few mutually exclusive values side by side (iOS segmented control). */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className,
  testId,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className={cn('inline-flex flex-wrap gap-0.5 rounded-[10px] bg-fill-quaternary p-0.5', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            data-testid={`${testId}-${option.value}-btn`}
            className={cn(
              'h-[30px] rounded-[8px] px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
              isActive
                ? 'bg-elevated font-semibold text-foreground shadow-raised'
                : 'font-medium text-label-secondary hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
