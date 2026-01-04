'use client';

import {
  CheckCircle,
  XCircle,
  Dumbbell,
  Layers,
  FileText,
  Link2,
  Plus,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DocumentImportResult } from '@/types/import.types';
import Link from 'next/link';

interface ImportSummaryProps {
  result: DocumentImportResult | null;
  onReset: () => void;
  className?: string;
}

/**
 * Podsumowanie importu z wynikami
 */
export function ImportSummary({ result, onReset, className }: ImportSummaryProps) {
  if (!result) {
    return null;
  }

  const isSuccess = result.success;
  const totalCreated =
    result.exercisesCreated +
    result.exerciseSetsCreated +
    result.clinicalNotesCreated;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Status header */}
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            'mb-4 flex h-20 w-20 items-center justify-center rounded-full',
            isSuccess
              ? 'bg-gradient-to-br from-primary via-primary to-primary-dark shadow-lg shadow-primary/30'
              : 'bg-destructive/20'
          )}
        >
          {isSuccess ? (
            <CheckCircle className="h-10 w-10 text-white" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive" />
          )}
        </div>

        <h2 className="mb-2 text-2xl font-bold text-foreground">
          {isSuccess ? 'Import zakończony!' : 'Wystąpił błąd'}
        </h2>

        <p className="text-muted-foreground">{result.message}</p>
      </div>

      {/* Stats grid */}
      {isSuccess && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Utworzone ćwiczenia */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {result.exercisesCreated}
                </p>
                <p className="text-sm text-muted-foreground">Nowych ćwiczeń</p>
              </div>
            </CardContent>
          </Card>

          {/* Użyte istniejące */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <Link2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {result.exercisesReused}
                </p>
                <p className="text-sm text-muted-foreground">Użytych istniejących</p>
              </div>
            </CardContent>
          </Card>

          {/* Zestawy */}
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                <Layers className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {result.exerciseSetsCreated}
                </p>
                <p className="text-sm text-muted-foreground">Zestawów</p>
              </div>
            </CardContent>
          </Card>

          {/* Notatki */}
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
                <FileText className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {result.clinicalNotesCreated}
                </p>
                <p className="text-sm text-muted-foreground">Notatek</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <h3 className="mb-2 font-medium text-destructive">Błędy:</h3>
            <ul className="space-y-1">
              {result.errors.map((error, index) => (
                <li key={index} className="text-sm text-destructive/80">
                  • {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Importuj kolejny dokument
        </Button>

        {isSuccess && result.exercisesCreated > 0 && (
          <Link href="/exercises">
            <Button className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary-dark">
              <Dumbbell className="h-4 w-4" />
              Zobacz ćwiczenia
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}

        {isSuccess && result.exerciseSetsCreated > 0 && (
          <Link href="/exercise-sets">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Layers className="h-4 w-4" />
              Zobacz zestawy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
