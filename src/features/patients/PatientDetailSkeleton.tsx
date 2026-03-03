import { FolderKanban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PatientDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Ładowanie szczegółów pacjenta">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-56 max-w-[80%] rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-[90%] rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 sm:col-span-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl bg-white/25" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-32 bg-white/25" />
                <Skeleton className="h-4 w-28 bg-white/20" />
              </div>
              <Skeleton className="h-5 w-5 rounded bg-white/25" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-info/25 via-info/10 to-info/5 sm:col-span-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl bg-white/25" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-20 bg-white/25" />
                <Skeleton className="h-4 w-36 bg-white/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:col-span-4">
          <Card className="border-border/40 bg-surface/50">
            <CardContent className="space-y-2 p-4 text-center">
              <Skeleton className="mx-auto h-7 w-16 rounded-lg" />
              <Skeleton className="mx-auto h-3 w-20 rounded-lg" />
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-surface/50">
            <CardContent className="space-y-2 p-4 text-center">
              <Skeleton className="mx-auto h-7 w-16 rounded-lg" />
              <Skeleton className="mx-auto h-3 w-24 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Badge variant="secondary" className="px-2 py-0">
            <Skeleton className="h-4 w-5 rounded-full" />
          </Badge>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="border-border/50 bg-surface/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-[85%] rounded-lg" />
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-4 w-14 rounded-lg" />
                      <Skeleton className="h-4 w-16 rounded-lg" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-border/40 bg-surface/30">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>

      <div className="border-t border-border/40 pt-4">
        <Card className="border-border/40 bg-surface/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-4 w-36 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
