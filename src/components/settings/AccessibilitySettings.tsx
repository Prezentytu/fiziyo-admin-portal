'use client';

import {
  Sun,
  Moon,
  Monitor,
  Type,
  Eye,
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
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
              <Monitor className="h-4 w-4 text-info" />
            </div>
            Motyw
          </CardTitle>
          <CardDescription>
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
                  : 'border-border/60 bg-surface hover:bg-surface-light'
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a1a] border border-border">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">Ciemny</span>
              {preferences.theme === 'dark' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
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
                  : 'border-border/60 bg-surface hover:bg-surface-light'
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-gray-200">
                <Sun className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Jasny</span>
              {preferences.theme === 'light' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
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
                  : 'border-border/60 bg-surface hover:bg-surface-light'
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-[#1a1a1a] border border-border">
                <Monitor className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm font-medium">Systemowy</span>
              {preferences.theme === 'system' && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Rozmiar czcionki */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
              <Type className="h-4 w-4 text-secondary" />
            </div>
            Rozmiar czcionki
          </CardTitle>
          <CardDescription>
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
                      : 'border-border/60 bg-surface hover:bg-surface-light'
                  )}
                >
                  <span
                    className="font-bold text-foreground transition-transform"
                    style={{ fontSize: `${14 * scale}px` }}
                  >
                    Aa
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Podgląd */}
          <div className="mt-4 rounded-xl border border-border/60 bg-surface-light p-4">
            <p className="text-xs text-muted-foreground mb-2">Podgląd:</p>
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
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            Opcje dostępności
          </CardTitle>
          <CardDescription>
            Dodatkowe ustawienia dla lepszej widoczności
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wysoki kontrast */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
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
            />
          </div>

          {/* Ograniczone animacje */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Przycisk resetowania */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Przywróć domyślne
        </Button>
      </div>
    </div>
  );
}
