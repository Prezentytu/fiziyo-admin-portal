'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, User, AlertCircle, ChevronRight, Undo2, Play, Building2, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { getExerciseVideos } from '@/utils/exerciseVideos';
import { isVimeoUrl, isYouTubeUrl } from '@/utils/videoEmbed';
import { HIDE_EXERCISE_TAGS } from '@/components/shared/exercise';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import { formatRelativeTime } from '@/utils/dateUtils';
import { getVerificationStatusBadge, type VerificationTrack } from '@/features/verification/utils/statusBadge';
import { ReviewWorkflowBadges, hasReviewWorkflowBadges } from '@/features/verification/ReviewWorkflowBadges';

interface VerificationTaskCardProps {
  exercise: AdminExercise;
  className?: string;
  onUnpublish?: (exerciseId: string, reason?: string) => void;
  isUnpublishing?: boolean;
  detailHref?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  track?: VerificationTrack;
  /** Status chip under the title; off when the active filter already names the status. */
  showStatus?: boolean;
}

/** „2 filmy”, „5 filmów”: Polish plural for the video badge. */
export function formatVideoCount(count: number): string {
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${count} ${isFew ? 'filmy' : 'filmów'}`;
}

function getQualityIndicators(exercise: AdminExercise) {
  const indicators: { label: string; type: 'warning' | 'info' }[] = [];

  if (getExerciseVideos(exercise).length === 0 && !exercise.gifUrl) {
    indicators.push({ label: 'Brak wideo', type: 'warning' });
  }
  if (!exercise.imageUrl && (!exercise.images || exercise.images.length === 0)) {
    indicators.push({ label: 'Brak obrazu', type: 'warning' });
  }
  if (!exercise.description || exercise.description.length < 50) {
    indicators.push({ label: 'Krótki opis', type: 'warning' });
  }
  if (!HIDE_EXERCISE_TAGS && (!exercise.mainTags || exercise.mainTags.length === 0)) {
    indicators.push({ label: 'Brak tagów', type: 'warning' });
  }

  return indicators;
}

export function VerificationTaskCard({
  exercise,
  className,
  onUnpublish,
  isUnpublishing,
  detailHref,
  selectable = false,
  selected = false,
  onSelectionChange,
  track = 'global',
  showStatus = true,
}: VerificationTaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const imageUrl = getMediaUrl(exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0]);
  const gifUrl = getMediaUrl(exercise.gifUrl);
  const videos = getExerciseVideos(exercise);
  const mainVideo = videos[0];
  const videoUrl = getMediaUrl(mainVideo);
  const isEmbeddedVideo = isYouTubeUrl(mainVideo) || isVimeoUrl(mainVideo);
  const previewVideoUrl = gifUrl || isEmbeddedVideo ? null : videoUrl;
  const hasVideoPreview = gifUrl || previewVideoUrl;
  const hasVideo = gifUrl || videoUrl;

  const statusBadge = getVerificationStatusBadge(exercise, track);
  const qualityIndicators = getQualityIndicators(exercise);
  const hasWarnings = qualityIndicators.some((i) => i.type === 'warning');
  const hasOpenReport = Boolean(exercise.hasOpenReport);
  const hasBadges =
    showStatus || hasOpenReport || hasReviewWorkflowBadges(exercise.reviewWorkflow) || qualityIndicators.length > 0;

  const handleUnpublish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUnpublish) {
      onUnpublish(exercise.id);
    }
  };

  const handleSelectionChange = (checked: boolean | 'indeterminate') => {
    onSelectionChange?.(checked === true);
  };

  // Handle hover to play video preview
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && previewVideoUrl) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="relative h-full">
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={handleSelectionChange}
          aria-label={`${selected ? 'Odznacz' : 'Zaznacz'} ćwiczenie ${exercise.name}`}
          className="absolute left-3 top-3 z-20 h-5 w-5 border-border bg-card shadow-sm"
          data-testid={`verification-card-${exercise.id}-select-checkbox`}
        />
      )}
      <Link href={detailHref ?? `/verification/${exercise.id}`} className="block h-full">
        <Card
          data-testid={`verification-card-${exercise.id}`}
          className={cn(
            'group relative flex h-full flex-col overflow-hidden transition-all duration-300 cursor-pointer',
            'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
            hasWarnings && 'border-status-warning/30',
            selected && 'border-primary ring-1 ring-primary/30',
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CardContent className="flex flex-1 flex-col p-0">
            {/* Image/Video section with hover preview */}
            <div className="relative aspect-video overflow-hidden bg-surface-light">
              {/* Static image (shown when not hovered or no video preview) */}
              {imageUrl && (
                <>
                  <div
                    className={cn(
                      'absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110 transition-opacity duration-300',
                      isHovered && hasVideoPreview && 'opacity-0'
                    )}
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                  <div className="relative h-full w-full">
                    <Image
                      src={imageUrl}
                      alt={exercise.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className={cn(
                        'object-contain transition-all duration-500',
                        'group-hover:scale-[1.03]',
                        isHovered && hasVideoPreview && 'opacity-0'
                      )}
                    />
                  </div>
                </>
              )}

              {/* GIF preview (shown on hover if available) */}
              {gifUrl && (
                <div className="absolute inset-0">
                  <Image
                    src={gifUrl}
                    alt={`${exercise.name} preview`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={cn(
                      'object-contain transition-opacity duration-300',
                      isHovered ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              )}

              {/* Video preview (shown on hover if no GIF available) */}
              {previewVideoUrl && (
                <video
                  ref={videoRef}
                  src={previewVideoUrl}
                  muted
                  loop
                  playsInline
                  className={cn(
                    'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}

              {/* No image fallback */}
              {!imageUrl && <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-12 w-12" />}

            </div>

            {/* Content section: every badge lives here so the photo stays clean. */}
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="min-w-0">
                <h3
                  className="line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
                  title={exercise.name}
                >
                  {exercise.name}
                </h3>
                {exercise.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{exercise.description}</p>
                )}
              </div>

              {hasBadges && (
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  data-testid={`verification-card-${exercise.id}-badges`}
                >
                  {showStatus && (
                    <Badge variant="secondary" data-testid={`verification-card-${exercise.id}-status-badge`}>
                      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', statusBadge.dotClassName)} />
                      {statusBadge.label}
                    </Badge>
                  )}
                  {hasOpenReport && (
                    <Badge variant="warning" data-testid={`verification-card-${exercise.id}-reported-badge`}>
                      <Flag className="h-3 w-3" aria-hidden />
                      Zgłoszenia ({exercise.openReportCount ?? 1})
                    </Badge>
                  )}
                  <ReviewWorkflowBadges
                    workflow={exercise.reviewWorkflow}
                    testIdPrefix={`verification-card-${exercise.id}`}
                    className="contents"
                  />
                  {qualityIndicators.map((indicator) => (
                    <Badge key={indicator.label} variant={indicator.type}>
                      <AlertCircle className="h-3 w-3" aria-hidden />
                      {indicator.label}
                    </Badge>
                  ))}
                </div>
              )}

              {exercise.latestReport && (
                <div
                  className="rounded-md border border-status-warning/20 bg-status-warning-muted px-2 py-1 text-[11px] text-status-warning line-clamp-2"
                  data-testid={`verification-card-${exercise.id}-report-context`}
                >
                  {exercise.latestReport.reasonCategory}: {exercise.latestReport.description.slice(0, 72)}
                </div>
              )}

              {/* Meta footer pinned to the bottom so cards in one row line up. */}
              <div className="mt-auto flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  {exercise.createdBy && (
                    <span className="flex min-w-0 max-w-[45%] items-center gap-1">
                      <User className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{exercise.createdBy.fullname || exercise.createdBy.email}</span>
                    </span>
                  )}
                  {exercise.createdAt && (
                    <span className="flex shrink-0 items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {formatRelativeTime(exercise.createdAt)}
                    </span>
                  )}
                  {hasVideo && (
                    <span className="flex shrink-0 items-center gap-1" data-testid={`verification-card-${exercise.id}-media`}>
                      <Play className="h-3 w-3 fill-current" aria-hidden />
                      {gifUrl ? 'GIF' : videos.length > 1 ? formatVideoCount(videos.length) : 'Wideo'}
                    </span>
                  )}
                  {exercise.organizationId && (
                    <span className="flex min-w-0 items-center gap-1 text-muted-foreground/70">
                      <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                      {/* TODO: Replace with organization.name when backend provides it */}
                      <span className="truncate">Org: {exercise.organizationId.slice(0, 8)}...</span>
                    </span>
                  )}
                </div>
                {onUnpublish ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnpublish}
                    disabled={isUnpublishing}
                    className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
                    data-testid={`verification-card-${exercise.id}-unpublish-btn`}
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Cofnij
                  </Button>
                ) : (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
