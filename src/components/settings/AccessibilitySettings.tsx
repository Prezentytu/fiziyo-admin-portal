'use client';

import {
  Sun,
  Moon,
  Monitor,
  Contrast,
  Check,
  RotateCcw,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useAccessibility,
  FONT_SIZE_VALUES,
  type FontSize,
} from '@/contexts/AccessibilityContext';

export function AccessibilitySettings() {
  const { preferences, updatePreference, resetToDefaults, isHydrated } = useAccessibility();

  // Reset z toastem
  const handleResetToDefaults = () => {
    resetToDefaults();
    toast.success('Przywrócono domyślne ustawienia');
  };

  if (!isHydrated) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-surface-light" />
            <div className="h-20 rounded bg-surface-light" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Motyw */}
      <Card className="rounded-xl border border-border/50 bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Motyw
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Wybierz preferowany motyw kolorystyczny
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {/* Dark */}
            <button
              onClick={() => updatePreference('theme', 'dark')}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                preferences.theme === 'dark'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/50 bg-background/50 hover:bg-background hover:border-primary/50'
              )}
              data-testid="settings-theme-dark"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a1a] border border-border">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">Ciemny</span>
              {preferences.theme === 'dark' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            {/* Light */}
            <button
              onClick={() => updatePreference('theme', 'light')}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                preferences.theme === 'light'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/50 bg-background/50 hover:bg-background hover:border-primary/50'
              )}
              data-testid="settings-theme-light"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-gray-200">
                <Sun className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Jasny</span>
              {preferences.theme === 'light' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            {/* System */}
            <button
              onClick={() => updatePreference('theme', 'system')}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                preferences.theme === 'system'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/50 bg-background/50 hover:bg-background hover:border-primary/50'
              )}
              data-testid="settings-theme-system"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-[#1a1a1a] border border-border">
                <Monitor className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm font-medium">Systemowy</span>
              {preferences.theme === 'system' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Rozmiar czcionki */}
      <Card className="rounded-xl border border-border/50 bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Rozmiar czcionki
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Dostosuj wielkość tekstu w aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(FONT_SIZE_VALUES) as FontSize[]).map((size) => {
              const { label, scale } = FONT_SIZE_VALUES[size];
              const isSelected = preferences.fontSize === size;

              return (
                <button
                  key={size}
                  onClick={() => updatePreference('fontSize', size)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border/50 bg-background/50 hover:bg-background hover:border-primary/50'
                  )}
                  data-testid={`settings-fontsize-${size}`}
                >
                  <span
                    className="font-bold text-foreground transition-transform"
                    style={{ fontSize: `${14 * scale}px` }}
                  >
                    Aa
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Podgląd */}
          <div className="mt-4 rounded-xl border border-border/50 bg-background/50 p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Podgląd:</p>
            <p
              className="text-foreground leading-relaxed"
              style={{ fontSize: FONT_SIZE_VALUES[preferences.fontSize].css }}
            >
              Ten tekst pokazuje jak będzie wyglądać treść przy wybranym rozmiarze czcionki.
              Fizjoterapia pomaga w rehabilitacji.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Opcje dostępności */}
      <Card className="rounded-xl border border-border/50 bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Opcje dostępności
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Dodatkowe ustawienia dla lepszej widoczności
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wysoki kontrast */}
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-4 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Contrast className="h-5 w-5 text-warning" />
              </div>
              <div>
                <Label htmlFor="high-contrast" className="text-sm font-medium">
                  Wysoki kontrast
                </Label>
                <p className="text-xs text-muted-foreground">
                  Zwiększa kontrast kolorów dla lepszej czytelności
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
              data-testid="settings-high-contrast-switch"
            />
          </div>

          {/* Ograniczone animacje */}
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-4 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <RotateCcw className="h-5 w-5 text-info" />
              </div>
              <div>
                <Label htmlFor="reduced-motion" className="text-sm font-medium">
                  Ograniczone animacje
                </Label>
                <p className="text-xs text-muted-foreground">
                  Wyłącza większość animacji i przejść
                </p>
              </div>
            </div>
            <Switch
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
              data-testid="settings-reduced-motion-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Przycisk resetowania */}
      <div className="flex justify-end pt-4">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          className="gap-2 rounded-xl border-border/50 hover:bg-accent/50 transition-all"
          data-testid="settings-reset-defaults-btn"
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Przywróć domyślne</span>
        </Button>
      </div>
    </div>
  );
}
