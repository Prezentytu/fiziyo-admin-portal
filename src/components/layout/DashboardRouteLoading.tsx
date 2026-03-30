import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reużywalny fallback ładowania dla tras dashboardu.
 * Odzwierciedla layout Action-First: kompaktowy header, hero + quick stats, lista.
 * Używany przez app/(dashboard)/loading.tsx oraz OrganizationGuard.
 */
export function DashboardRouteLoading() {
  return (
    <div
      className="space-y-6 animate-stagger"
      data-testid="dashboard-route-loading"
      aria-label="Ładowanie"
      aria-busy="true"
    >
      {/* Compact Header – przycisk powrotu / tytuł po lewej, opcje po prawej */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-36 rounded-lg shrink-0" />
        <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
      </div>

      {/* Tytuł strony + ewentualny opis */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-lg" />
      </div>

      {/* Hero Action + Quick Stats – grid 12 kolumn jak na stronach */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero action (gradient) – 4 kolumny */}
        <div className="rounded-2xl border border-border/40 bg-primary/10 p-5 lg:col-span-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-5 rounded shrink-0" />
          </div>
        </div>
        {/* Quick stats – 3 karty po ~2–3 kolumny */}
        <div className="grid grid-cols-3 gap-3 sm:col-span-1 lg:col-span-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center"
            >
              <Skeleton className="h-6 w-10 rounded-lg mb-2" />
              <Skeleton className="h-4 w-14 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Sekcja listy – nagłówek + wiersze (avatar + 2 linie) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border/40 bg-surface/50 p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40 rounded-lg" />
                <Skeleton className="h-3 w-28 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
