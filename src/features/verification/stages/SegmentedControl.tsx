import { cn } from '@/lib/utils';

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  testIdPrefix: string;
  className?: string;
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  testIdPrefix,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex gap-0.5 rounded-full bg-fill-tertiary p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-7 rounded-full px-3 text-[13px] font-semibold transition-colors',
            value === option.value ? 'bg-elevated text-foreground shadow-raised' : 'text-label-secondary'
          )}
          data-testid={`${testIdPrefix}-${option.value}-btn`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
