import { Skeleton } from '@/components/ui/skeleton';
import { PageSheet } from '@/components/shared/page';

/** Loading state shared by every verification detail route (global, organization, cross-org). */
export function VerificationWorkspaceSkeleton() {
  return (
    <PageSheet contentClassName="gap-5" data-testid="verification-workspace-loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
        <Skeleton className="aspect-[4/5] w-full rounded-sheet" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      </div>
    </PageSheet>
  );
}
