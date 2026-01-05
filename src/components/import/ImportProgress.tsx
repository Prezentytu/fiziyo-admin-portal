'use client';

import { Check, FileSearch, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  className?: string;
}

const steps = [
  { id: 'read', icon: FileSearch, label: 'Odczytywanie dokumentu' },
  { id: 'analyze', icon: Brain, label: 'Analiza przez AI' },
  { id: 'prepare', icon: Sparkles, label: 'Przygotowanie wyników' },
];

/**
 * Prosty, czytelny progress podczas analizy dokumentu
 * Zaprojektowany dla użytkowników 45+ - bez rozpraszających animacji
 */
export function ImportProgress({ className }: ImportProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Symulacja postępu - płynna, przewidywalna
  useEffect(() => {
    const totalDuration = 8000; // 8 sekund
    const intervalTime = 100;
    const increment = 100 / (totalDuration / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;

        // Aktualizuj aktywny krok na podstawie progresu
        if (next < 33) {
          setCurrentStepIndex(0);
        } else if (next < 66) {
          setCurrentStepIndex(1);
        } else {
          setCurrentStepIndex(2);
        }

        // Zatrzymaj przed 100% (czekamy na rzeczywiste zakończenie)
        if (next >= 95) {
          return 95;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {/* Główny komunikat */}
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Analizuję Twój dokument...
        </h2>
        <p className="text-muted-foreground">
          To może potrwać do 30 sekund
        </p>
      </div>

      {/* Progress bar - prosty, czytelny */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Postęp</span>
          <span className="text-sm font-medium text-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* 3 kroki - jasne, czytelne */}
      <div className="w-full max-w-md space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200',
                isActive && 'bg-primary/10',
                isComplete && 'bg-surface-light'
              )}
            >
              {/* Ikona statusu */}
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                  isComplete
                    ? 'bg-primary text-white'
                    : isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-light text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Tekst */}
              <div className="flex-1">
                <span
                  className={cn(
                    'text-base transition-colors duration-200',
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
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Trwa przetwarzanie...
                  </p>
                )}
              </div>

              {/* Status indicator */}
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
              {isComplete && (
                <span className="text-sm text-primary font-medium">
                  Ukończono
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
