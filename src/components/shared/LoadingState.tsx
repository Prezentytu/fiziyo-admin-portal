import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  count?: number;
  type?: "card" | "row" | "text" | "exercise" | "exercise-row";
}

export function LoadingState({
  className,
  count = 3,
  type = "card",
}: LoadingStateProps) {
  if (type === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (type === "row") {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Exercise card skeleton - matches ExerciseCard grid view
  if (type === "exercise") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-border/60 bg-surface overflow-hidden"
          >
            {/* Image section with badge overlay */}
            <div className="relative aspect-[16/10] bg-surface-light">
              <Skeleton className="absolute inset-0" />
              {/* Type badge placeholder */}
              <div className="absolute top-3 left-3">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              {/* Tags placeholder at bottom */}
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>

            {/* Content section */}
            <div className="flex flex-col flex-1 p-4 space-y-3">
              {/* Title */}
              <Skeleton className="h-5 w-3/4" />
              {/* Description (2 lines) */}
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              {/* Parameters footer */}
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  // Exercise row skeleton - matches ExerciseCard compact view
  if (type === "exercise-row") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-surface p-3"
          >
            {/* Thumbnail */}
            <Skeleton className="h-14 w-14 flex-shrink-0 rounded-lg" />

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>

            {/* Tags */}
            <div className="hidden sm:flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>

            {/* Action button placeholder */}
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-4 space-y-3"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
