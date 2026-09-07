'use client';

import { useId } from 'react';
import { Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { FONT_SIZE_VALUES, type FontSize, type Theme } from '@/lib/accessibilityPreferences';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: 'Jasny', icon: Sun },
  { value: 'dark', label: 'Ciemny', icon: Moon },
  { value: 'system', label: 'Systemowy', icon: Monitor },
] as const;

const OPTION_CLASS_NAME =
  'flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-medium leading-snug text-foreground hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ring-offset-background';

export function AccessibilitySettings() {
  const id = useId();
  const { preferences, updatePreference, resetToDefaults, isHydrated } = useAccessibility();

  const handleResetToDefaults = () => {
    resetToDefaults();
    toast.success('Przywrócono domyślne ustawienia');
  };

  if (!isHydrated) {
    return (
      <div
        role="status"
        aria-label="Ładowanie ustawień dostępności"
        aria-busy="true"
        className="space-y-4 motion-safe:animate-pulse"
      >
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-20 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8 tracking-normal">
      <section className="space-y-4" aria-labelledby={`${id}-theme-heading`}>
        <h3 id={`${id}-theme-heading`} className="text-base font-semibold text-foreground">
          Motyw
        </h3>
        <RadioGroup
          aria-labelledby={`${id}-theme-heading`}
          value={preferences.theme}
          onValueChange={(value) => updatePreference('theme', value as Theme)}
          className="grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Label
              key={value}
              htmlFor={`${id}-theme-${value}`}
              className={cn(OPTION_CLASS_NAME, preferences.theme === value && 'border-primary bg-primary/5')}
            >
              <RadioGroupItem
                data-testid={`settings-theme-${value}`}
                id={`${id}-theme-${value}`}
                value={value}
                className="shrink-0 border-muted-foreground text-foreground data-[state=checked]:border-primary"
              />
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 whitespace-normal break-words">{label}</span>
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6" aria-labelledby={`${id}-font-heading`}>
        <h3 id={`${id}-font-heading`} className="text-base font-semibold text-foreground">
          Rozmiar czcionki
        </h3>
        <RadioGroup
          aria-labelledby={`${id}-font-heading`}
          value={preferences.fontSize}
          onValueChange={(value) => updatePreference('fontSize', value as FontSize)}
          className="grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3"
        >
          {(Object.keys(FONT_SIZE_VALUES) as FontSize[]).map((size) => (
            <Label
              key={size}
              htmlFor={`${id}-fontsize-${size}`}
              className={cn(OPTION_CLASS_NAME, preferences.fontSize === size && 'border-primary bg-primary/5')}
            >
              <RadioGroupItem
                data-testid={`settings-fontsize-${size}`}
                id={`${id}-fontsize-${size}`}
                value={size}
                className="shrink-0 border-muted-foreground text-foreground data-[state=checked]:border-primary"
              />
              <span className="min-w-0 whitespace-normal break-words">{FONT_SIZE_VALUES[size].label}</span>
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6" aria-labelledby={`${id}-options-heading`}>
        <h3 id={`${id}-options-heading`} className="text-base font-semibold text-foreground">
          Opcje dostępności
        </h3>
        <div className="space-y-2">
          <Label
            htmlFor="high-contrast"
            className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-2 text-sm leading-snug text-foreground"
          >
            <span className="min-w-0 whitespace-normal break-words">Wysoki kontrast</span>
            <Switch
              data-testid="settings-high-contrast-switch"
              id="high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
            />
          </Label>
          <Label
            htmlFor="reduced-motion"
            className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-2 text-sm leading-snug text-foreground"
          >
            <span className="min-w-0 whitespace-normal break-words">Ograniczone animacje</span>
            <Switch
              data-testid="settings-reduced-motion-switch"
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
            />
          </Label>
        </div>
      </section>

      <div className="flex justify-end border-t border-border/60 pt-6">
        <Button
          data-testid="settings-reset-defaults-btn"
          variant="outline"
          onClick={handleResetToDefaults}
          className="h-auto min-h-11 max-w-full gap-2 whitespace-normal rounded-lg py-2 text-left"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">Przywróć domyślne</span>
        </Button>
      </div>
    </div>
  );
}
