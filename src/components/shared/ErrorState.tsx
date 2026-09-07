import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  testId?: string;
}

export function ErrorState({
  title = 'Nie udało się wczytać danych',
  description = 'Sprawdź połączenie i spróbuj ponownie.',
  onRetry,
  testId = 'page-error-state',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" data-testid={testId}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
      {onRetry ? (
        <Button data-testid="page-error-retry" type="button" variant="outline" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      ) : null}
    </div>
  );
}
