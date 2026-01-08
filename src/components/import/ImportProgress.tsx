'use client';

import { Check, FileSearch, Brain, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ImportProgressProps {
  className?: string;
}

const steps = [
  { id: 'read', icon: FileSearch, label: 'Odczytywanie dokumentu', description: 'Pobieram treść z pliku...' },
  { id: 'analyze', icon: Brain, label: 'Analiza przez AI', description: 'Szukam ćwiczeń i zestawów...' },
  { id: 'prepare', icon: Sparkles, label: 'Przygotowanie wyników', description: 'Porównuję z Twoją bazą...' },
];

const tips = [
  'AI przeszukuje Twoją bazę ćwiczeń, żeby znaleźć podobne...',
  'Analizuję parametry ćwiczeń: serie, powtórzenia, czas...',
  'Szukam zestawów ćwiczeń i notatek klinicznych...',
  'Rozpoznaję nazwy ćwiczeń i dopasowuję do Twojej bazy...',
  'Wyciągam informacje o pacjencie i dacie dokumentu...',
];

/**
 * Stan oczekiwania podczas analizy dokumentu przez AI
 * Bez fake'owego paska postępu - zamiast tego czytelne kroki i rotujące tips
 * Zaprojektowany dla użytkowników 40+ - prosty, zrozumiały komunikat
 */
export function ImportProgress({ className }: ImportProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rotacja kroków - wolniejsza, bardziej realistyczna
  // Krok 1: 0-8s, Krok 2: 8-25s, Krok 3: 25s+
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;

        // Aktualizuj aktywny krok na podstawie czasu
        if (next < 8) {
          setCurrentStepIndex(0);
        } else if (next < 25) {
          setCurrentStepIndex(1);
        } else {
          setCurrentStepIndex(2);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(stepInterval);
  }, []);

  // Rotacja tips - co 5 sekund
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(tipInterval);
  }, []);

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {/* Główna animacja - pulsujące kółko z ikoną */}
      <div className="relative mb-8">
        {/* Zewnętrzne pulsujące kółko */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />

        {/* Główna ikona */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm">
          <Brain className="h-12 w-12 text-primary animate-pulse" />
        </div>
      </div>

      {/* Główny komunikat */}
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Analizuję Twój dokument...
        </h2>
        <p className="text-muted-foreground">
          To może potrwać do minuty – proszę, nie zamykaj strony
        </p>
      </div>

      {/* 3 kroki - bez paska postępu, z animacją */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300',
                isActive && 'bg-primary/10 scale-[1.02]',
                isComplete && 'bg-surface-light',
                !isActive && !isComplete && 'opacity-50'
              )}
            >
              {/* Ikona statusu */}
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                  isComplete
                    ? 'bg-primary text-white'
                    : isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-light text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Tekst */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-base transition-colors duration-200 block',
                    isActive
                      ? 'font-semibold text-foreground'
                      : isComplete
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {isActive && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Status indicator */}
              {isComplete && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Rotujący tip - informacyjny, żeby użytkownik wiedział co się dzieje */}
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface-light/50 px-6 py-4 text-center">
          <p
            className="text-sm text-muted-foreground transition-opacity duration-500"
            key={currentTipIndex}
          >
            {tips[currentTipIndex]}
          </p>
        </div>
      </div>

      {/* Licznik czasu - dla przejrzystości */}
      {elapsedSeconds > 10 && (
        <p className="mt-6 text-xs text-muted-foreground/60">
          Czas analizy: {elapsedSeconds}s
        </p>
      )}
    </div>
  );
}
