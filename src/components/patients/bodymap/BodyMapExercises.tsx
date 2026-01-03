'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Sparkles, Dumbbell, ArrowRight, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { AnatomicalRegionId, PainPoint, PainArea } from '@/types/painMap';
import { ANATOMICAL_REGIONS, getExerciseTagsForRegions } from './BodyMapRegions';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';

interface Exercise {
  id: string;
  name: string;
  description?: string;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  imageUrl?: string;
  images?: string[];
  mainTags?: string[];
  additionalTags?: string[];
}

interface BodyMapExercisesProps {
  painPoints: PainPoint[];
  painAreas: PainArea[];
  onAddToSet?: (exerciseIds: string[]) => void;
  onCreateSetFromExercises?: (exerciseIds: string[]) => void;
  className?: string;
}

export function BodyMapExercises({
  painPoints,
  painAreas,
  onAddToSet,
  onCreateSetFromExercises,
  className,
}: BodyMapExercisesProps) {
  const { user } = useUser();

  // Get organization ID
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as { userByClerkId?: { organizationIds?: string[] } })
    ?.userByClerkId?.organizationIds?.[0];

  // Get all exercises
  const { data: exercisesData, loading } = useQuery<{
    organizationExercises?: Exercise[];
  }>(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Extract affected regions from pain points and areas
  const affectedRegions = useMemo(() => {
    const regions = new Set<AnatomicalRegionId>();
    painPoints.forEach((p) => p.region && regions.add(p.region));
    painAreas.forEach((a) => regions.add(a.regionId));
    return Array.from(regions);
  }, [painPoints, painAreas]);

  // Get exercise tags for affected regions
  const relevantTags = useMemo(
    () => getExerciseTagsForRegions(affectedRegions),
    [affectedRegions]
  );

  // Filter exercises that match the tags
  const suggestedExercises = useMemo(() => {
    if (!exercisesData?.organizationExercises) return [];

    const exercises = exercisesData.organizationExercises as Exercise[];
    const lowerTags = relevantTags.map((t) => t.toLowerCase());

    return exercises
      .filter((exercise) => {
        const exerciseTags = [
          ...(exercise.mainTags || []),
          ...(exercise.additionalTags || []),
        ].map((t) => t.toLowerCase());

        // Check if any exercise tag matches any relevant tag
        return exerciseTags.some(
          (tag) =>
            lowerTags.some((rt) => tag.includes(rt) || rt.includes(tag))
        );
      })
      .slice(0, 6); // Limit to 6 suggestions
  }, [exercisesData, relevantTags]);

  // Get region names for display
  const regionNames = useMemo(
    () =>
      affectedRegions
        .map((r) => ANATOMICAL_REGIONS[r]?.namePolish)
        .filter(Boolean),
    [affectedRegions]
  );

  if (affectedRegions.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-border/40', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Sugerowane ćwiczenia
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Na podstawie zaznaczonych regionów:{' '}
          <span className="text-foreground">
            {regionNames.slice(0, 3).join(', ')}
            {regionNames.length > 3 && ` +${regionNames.length - 3}`}
          </span>
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tags preview */}
        <div className="flex flex-wrap gap-1">
          {relevantTags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {relevantTags.length > 6 && (
            <Badge variant="outline" className="text-[10px]">
              +{relevantTags.length - 6}
            </Badge>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggested exercises */}
        {!loading && suggestedExercises.length > 0 && (
          <div className="space-y-2">
            {suggestedExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-surface-light/50 hover:bg-surface-light transition-colors cursor-pointer group"
              >
                {/* Exercise image */}
                <div className="h-10 w-10 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                  {exercise.imageUrl || (exercise.images && exercise.images[0]) ? (
                    <img
                      src={exercise.imageUrl || exercise.images?.[0]}
                      alt={exercise.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Exercise info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {exercise.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exercise.type === 'reps' && exercise.sets && exercise.reps
                      ? `${exercise.sets}x${exercise.reps}`
                      : exercise.type === 'time' && exercise.duration
                      ? `${exercise.duration}s`
                      : exercise.type}
                  </p>
                </div>

                {/* Add button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToSet?.([exercise.id]);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* No exercises found */}
        {!loading && suggestedExercises.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Brak dopasowanych ćwiczeń. Dodaj ćwiczenia z odpowiednimi tagami.
          </p>
        )}

        {/* Actions */}
        {suggestedExercises.length > 0 && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={() =>
                onCreateSetFromExercises?.(suggestedExercises.map((e) => e.id))
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              Utwórz zestaw
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => {
                // Navigate to exercises with filter
                // This would typically use router.push with query params
              }}
            >
              Zobacz więcej
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
