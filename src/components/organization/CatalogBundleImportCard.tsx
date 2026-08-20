'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileJson, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExerciseBundleImportResult } from '@/graphql/mutations/exercises.mutations';
import { useExerciseBundleImport } from '@/hooks/useExerciseBundleImport';
import { checkCatalogBundleText } from '@/lib/organization/catalogBundleFile';

const STEPS = ['tag-categories.json', 'tags.json', 'exercises-001.json', 'kolejne exercises-00x.json'] as const;

interface CatalogBundleImportCardProps {
  organizationId: string;
}

function summarizeResult(result: ExerciseBundleImportResult): string {
  const parts = [
    result.fileKind ? `plik: ${result.fileKind}` : null,
    result.exercisesUpserted ? `ćwiczenia ${result.exercisesUpserted}` : null,
    result.tagsUpserted ? `tagi ${result.tagsUpserted}` : null,
    result.categoriesUpserted ? `kategorie ${result.categoriesUpserted}` : null,
    result.skipped ? `pominięte ${result.skipped}` : null,
  ].filter((part): part is string => part !== null);

  return parts.join(' · ');
}

export function CatalogBundleImportCard({ organizationId }: CatalogBundleImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importBundle, { loading }] = useExerciseBundleImport();
  const [lastResult, setLastResult] = useState<ExerciseBundleImportResult | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    const check = checkCatalogBundleText(text);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }

    try {
      const { data } = await importBundle({
        variables: {
          organizationId,
          json: text,
          asGlobal: false,
        },
      });

      const result = data?.importExerciseBundle;
      if (!result) {
        toast.error('Serwer nie zwrócił wyniku. Sprawdź, czy backend jest wdrożony.');
        return;
      }

      setLastResult(result);
      setLastFileName(file.name);

      if (!result.success) {
        toast.error(result.errors[0] ?? 'Plik odrzucony. Popraw JSON i wgraj ponownie.');
        return;
      }

      toast.success(`Zaimportowano ${file.name}`);
    } catch {
      toast.error('Import nie powiódł się. Backend musi znać mutację importExerciseBundle.');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="rounded-xl border border-border/50 bg-card/30" data-testid="settings-catalog-import-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileJson className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Import katalogu JSON</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Wgraj paczki po korekcie AI. Te same <code className="text-xs">id</code> = te same zdjęcia.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2 text-sm text-muted-foreground">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Jeden plik na raz. Zestawy dodajesz potem w panelu — ten import ich nie tworzy.
        </p>

        <input
          ref={inputRef}
          id="catalog-bundle-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          data-testid="settings-catalog-import-input"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
          }}
        />

        <Button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="h-11 gap-2 rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
          data-testid="settings-catalog-import-pick"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? 'Wgrywanie…' : 'Wybierz plik JSON'}
        </Button>

        {lastResult?.success && lastFileName ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-4"
            data-testid="settings-catalog-import-result"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{lastFileName}</p>
              <p className="text-sm text-muted-foreground">{summarizeResult(lastResult)}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
