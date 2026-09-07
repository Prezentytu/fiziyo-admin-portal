import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/shared/page/PageShell';

export function PatientDetailSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6" aria-busy="true" aria-label="Ładowanie szczegółów pacjenta">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
          <Skeleton className="h-11 w-11 rounded-sm" />
          <div className="col-span-2 row-start-2 flex min-w-0 items-start gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <Skeleton className="h-11 w-11 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-56 max-w-full rounded-sm" />
              <Skeleton className="h-10 w-72 max-w-full rounded-sm" />
            </div>
          </div>
          <Skeleton className="col-start-2 row-start-1 h-11 w-11 rounded-sm sm:col-start-3 xl:col-start-4" />
          <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:col-span-3 xl:col-span-1 xl:col-start-3 xl:row-start-1">
            <Skeleton className="h-11 w-40 rounded-sm" />
            <Skeleton className="h-11 w-28 rounded-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-b border-border pb-2">
          {['overview', 'visit', 'activity'].map((tab) => (
            <Skeleton key={tab} className="h-11 w-24 rounded-sm" />
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-2">
          {['active-sets', 'completions'].map((stat) => (
            <div key={stat} className="flex min-w-0 items-center gap-2 py-1">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-5 w-28 rounded-sm" />
            </div>
          ))}
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 space-y-4">
            <div className="flex min-h-11 items-center">
              <Skeleton className="h-6 w-48 max-w-full rounded-sm" />
            </div>
            <div className="space-y-3">
              {['first-plan', 'second-plan'].map((plan) => (
                <Card key={plan} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-48 max-w-full rounded-sm" />
                        <div className="flex flex-wrap items-center gap-3">
                          <Skeleton className="h-4 w-20 rounded-sm" />
                          <Skeleton className="h-4 w-14 rounded-sm" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 rounded-sm shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-6 w-24 max-w-full rounded-sm" />
              <Skeleton className="h-11 w-28 max-w-full rounded-sm" />
            </div>
            <Skeleton className="h-32 w-full rounded-sm" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
