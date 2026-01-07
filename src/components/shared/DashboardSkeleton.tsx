import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Elegancki skeleton loading state dla dashboardu.
 * Odzwierciedla strukturę UI z efektem shimmer.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-stagger">
      {/* Header Section - Greeting with date */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-28 rounded-lg hidden sm:block" />
      </div>

      {/* Quick Actions - Hero + Companions Layout */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action Skeleton */}
        <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-36 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-5 rounded shrink-0" />
          </div>
        </div>

        {/* Secondary Action Skeleton */}
        <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-surface/50 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Tertiary Action Skeleton */}
        <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-surface/50 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-3 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Bento Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Patients Section Skeleton */}
        <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-5 w-28 rounded-lg" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    <Skeleton className="h-3 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exercise Sets Section Skeleton */}
        <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ animationDelay: `${(i + 4) * 50}ms` }}
                >
                  {/* Set Thumbnail Skeleton - 2x2 grid */}
                  <div className="h-10 w-10 rounded-lg overflow-hidden grid grid-cols-2 gap-0.5 shrink-0">
                    <Skeleton className="rounded-none" />
                    <Skeleton className="rounded-none" />
                    <Skeleton className="rounded-none" />
                    <Skeleton className="rounded-none" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded-lg" />
                    <Skeleton className="h-3 w-20 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





