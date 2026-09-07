import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div
      data-testid="dashboard-skeleton"
      data-redesign-surface="dashboard"
      role="status"
      aria-label="Ładowanie pulpitu"
      aria-busy="true"
      className="@container/dashboard mx-auto w-full min-w-0 max-w-screen-2xl space-y-6"
    >
      <div data-redesign-part="dashboard-heading" className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-40 max-w-full" />
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2 sm:flex-1 sm:basis-48">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-5 w-48 max-w-full" />
          </div>
          <Skeleton className="h-11 w-48 max-w-full" />
        </div>
      </div>
      <div
        aria-hidden="true"
        data-redesign-part="dashboard-columns"
        className="grid items-start gap-8 @4xl/dashboard:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]"
      >
        {['patients', 'sets'].map((section) => (
          <div key={section} data-redesign-part={section === 'sets' ? 'dashboard-library' : undefined} className="min-w-0">
            <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-11 w-36 max-w-full" />
            </div>
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex min-h-20 min-w-0 items-center gap-3 py-4">
                <Skeleton className={`h-10 w-10 shrink-0 ${section === 'patients' ? 'rounded-full' : 'rounded-lg'}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="h-4 w-24 max-w-full" />
                </div>
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            ))}
            <Skeleton className="mt-2 h-11 w-32 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
