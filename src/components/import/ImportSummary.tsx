'use client';

import {
  CheckCircle,
  XCircle,
  Dumbbell,
  Layers,
  FileText,
  Link2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DocumentImportResult } from '@/types/import.types';
import Link from 'next/link';

interface ImportSummaryProps {
  result: DocumentImportResult | null;
  onReset: () => void;
  /** Czy notatki zostały pominięte z powodu braku pacjenta */
  notesSkippedDueToNoPatient?: boolean;
  /** Liczba pominiętych notatek */
  skippedNotesCount?: number;
  className?: string;
}

/**
 * Podsumowanie importu - czytelne, proste
 * Duży checkmark, lista wyników, jeden główny CTA
 */
export function ImportSummary({
  result,
  onReset,
  notesSkippedDueToNoPatient = false,
  skippedNotesCount = 0,
  className
}: ImportSummaryProps) {
  if (!result) {
    return null;
  }

  const isSuccess = result.success;

  return (
    <div className={cn('space-y-8', className)}>
      {/* Status - duży checkmark */}
      <div className="flex flex-col items-center text-center py-8">
        <div
          className={cn(
            'mb-6 flex h-24 w-24 items-center justify-center rounded-full',
            isSuccess
              ? 'bg-primary/20'
              : 'bg-destructive/20'
          )}
        >
          {isSuccess ? (
            <CheckCircle className="h-14 w-14 text-primary" />
          ) : (
            <XCircle className="h-14 w-14 text-destructive" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSuccess ? 'Import zakończony pomyślnie!' : 'Wystąpił błąd'}
        </h2>

        <p className="text-muted-foreground max-w-md">
          {result.message}
        </p>
      </div>

      {/* Lista wyników - prosta, czytelna */}
      {isSuccess && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Co zostało zaimportowane:
            </h3>

            <ul className="space-y-3">
              {result.exercisesCreated > 0 && (
                <li className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-base">
                    Utworzono <strong>{result.exercisesCreated}</strong> nowych ćwiczeń
                  </span>
                </li>
              )}

              {result.exercisesReused > 0 && (
                <li className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Link2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-base">
                    Użyto <strong>{result.exercisesReused}</strong> istniejących ćwiczeń
                  </span>
                </li>
              )}

              {result.exerciseSetsCreated > 0 && (
                <li className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Layers className="h-5 w-5 text-purple-500" />
                  </div>
                  <span className="text-base">
                    Utworzono <strong>{result.exerciseSetsCreated}</strong> {result.exerciseSetsCreated === 1 ? 'zestaw' : 'zestawy'}
                  </span>
                </li>
              )}

              {result.clinicalNotesCreated > 0 && (
                <li className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                    <FileText className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="text-base">
                    Zapisano <strong>{result.clinicalNotesCreated}</strong> {result.clinicalNotesCreated === 1 ? 'notatkę' : 'notatki'} kliniczną
                  </span>
                </li>
              )}

              {/* Gdy nic nie zaimportowano */}
              {result.exercisesCreated === 0 &&
               result.exercisesReused === 0 &&
               result.exerciseSetsCreated === 0 &&
               result.clinicalNotesCreated === 0 && (
                <li className="text-muted-foreground text-center py-4">
                  Nie zaimportowano żadnych danych
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Ostrzeżenie o pominiętych notatkach */}
      {notesSkippedDueToNoPatient && skippedNotesCount > 0 && (
        <Card className="max-w-lg mx-auto border-warning/50 bg-warning/5">
          <CardContent className="flex items-start gap-4 p-5">
            <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {skippedNotesCount} {skippedNotesCount === 1 ? 'notatka pominięta' : 'notatki pominięte'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Notatki kliniczne nie zostały zaimportowane, ponieważ nie wybrano pacjenta.
                Następnym razem wybierz pacjenta, aby zaimportować również notatki.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Błędy */}
      {result.errors.length > 0 && (
        <Card className="max-w-lg mx-auto border-destructive/50 bg-destructive/5">
          <CardContent className="p-5">
            <h3 className="font-medium text-destructive mb-3">
              Wystąpiły błędy:
            </h3>
            <ul className="space-y-2">
              {result.errors.map((error, index) => (
                <li key={index} className="text-sm text-destructive/80 flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Przyciski - jeden główny CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        {isSuccess && (result.exercisesCreated > 0 || result.exercisesReused > 0) && (
          <Link href="/exercises">
            <Button size="lg" className="gap-2 h-12 px-8 text-base bg-primary hover:bg-primary-dark">
              <Dumbbell className="h-5 w-5" />
              Zobacz zaimportowane ćwiczenia
            </Button>
          </Link>
        )}

        {isSuccess && result.exerciseSetsCreated > 0 && (
          <Link href="/exercise-sets">
            <Button variant="outline" size="lg" className="gap-2 h-12 px-8 text-base">
              <Layers className="h-5 w-5" />
              Zobacz zestawy
            </Button>
          </Link>
        )}

        <Button
          variant="ghost"
          onClick={onReset}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Importuj kolejny dokument
        </Button>
      </div>
    </div>
  );
}
