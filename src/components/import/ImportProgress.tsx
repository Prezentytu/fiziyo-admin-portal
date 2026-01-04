'use client';

import { Loader2, Sparkles, FileSearch, Brain, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ImportProgressProps {
  className?: string;
}

const steps = [
  { icon: FileSearch, label: 'Odczytywanie dokumentu...' },
  { icon: Brain, label: 'Analiza przez AI...' },
  { icon: Sparkles, label: 'Ekstrakcja danych...' },
];

/**
 * Animowany progress podczas analizy dokumentu
 */
export function ImportProgress({ className }: ImportProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Symulacja postępu
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      {/* Animated loader */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary-dark shadow-xl shadow-primary/30">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      </div>

      {/* Current step */}
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-foreground">
          Analizuję dokument...
        </h2>
        <p className="text-muted-foreground">
          To może potrwać kilka sekund
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-2 transition-all duration-300',
                isActive && 'bg-primary/10 scale-105',
                isComplete && 'opacity-50'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : isComplete
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-light text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className={cn('h-4 w-4', isActive && 'animate-pulse')} />
                )}
              </div>
              <span
                className={cn(
                  'text-sm transition-colors',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
