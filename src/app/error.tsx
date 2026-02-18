'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[App Error]', error);
    }
  }, [error]);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center"
      data-testid="common-error-page"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Wystąpił błąd</h1>
        <p className="text-muted-foreground max-w-md">
          Przepraszamy, coś poszło nie tak. Spróbuj odświeżyć stronę lub wróć do panelu głównego.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-surface border border-border p-4 text-left text-xs text-destructive">
            {error.message}
          </pre>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="default" className="gap-2" data-testid="common-error-page-retry-btn">
          <RefreshCw className="h-4 w-4" />
          Spróbuj ponownie
        </Button>
        <Button variant="outline" className="gap-2" asChild data-testid="common-error-page-home-btn">
          <Link href="/">
            <Home className="h-4 w-4" />
            Panel główny
          </Link>
        </Button>
      </div>
    </div>
  );
}
