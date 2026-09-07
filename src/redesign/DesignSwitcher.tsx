'use client';

import { Item as RadioItem } from '@radix-ui/react-radio-group';
import { RadioGroup } from '@/components/ui/radio-group';
import { useDesignVariant } from './DesignVariantProvider';
import { isDesignPreviewEnabled, parseDesignVariant } from './preferences';

export function DesignSwitcher({ location = 'header', disabled = false }: { location?: string; disabled?: boolean }) {
  const context = useDesignVariant();
  if (!isDesignPreviewEnabled() || !context) return null;

  return (
    <RadioGroup
      data-testid={`common-design-switch-${location}`}
      aria-label={'Wygl\u0105d interfejsu'}
      orientation="horizontal"
      value={context.variant}
      onValueChange={(value) => context.setVariant(parseDesignVariant(value))}
      disabled={disabled || !context.isHydrated}
      className="inline-grid max-w-full grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1"
    >
      {(
        [
          ['current', 'Obecny'],
          ['redesign', 'Nowy'],
        ] as const
      ).map(([value, label]) => (
        <RadioItem
          data-testid={`common-design-${location}-${value}`}
          key={value}
          value={value}
          className="min-h-9 min-w-0 rounded-sm px-3 text-sm font-medium text-foreground outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-surface data-[state=checked]:shadow-sm"
        >
          {label}
        </RadioItem>
      ))}
    </RadioGroup>
  );
}
