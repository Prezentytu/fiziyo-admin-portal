"use client";

import Link from "next/link";
import { Clock, User, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { AdminExercise, ContentStatus } from "@/graphql/types/adminExercise.types";

interface VerificationTaskCardProps {
  exercise: AdminExercise;
  className?: string;
}

function getStatusBadge(status: ContentStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return { label: "Oczekuje", variant: "warning" as const, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "CHANGES_REQUESTED":
      return { label: "Do poprawy", variant: "destructive" as const, className: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
    case "APPROVED":
      return { label: "Zatwierdzony", variant: "success" as const, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "PUBLISHED":
      return { label: "Opublikowany", variant: "default" as const, className: "bg-primary/10 text-primary border-primary/20" };
    default:
      return { label: "Szkic", variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
  }
}

function getQualityIndicators(exercise: AdminExercise) {
  const indicators: { label: string; type: "warning" | "info" }[] = [];
  
  if (!exercise.videoUrl && !exercise.gifUrl) {
    indicators.push({ label: "Brak wideo", type: "warning" });
  }
  if (!exercise.imageUrl && (!exercise.images || exercise.images.length === 0)) {
    indicators.push({ label: "Brak obrazu", type: "warning" });
  }
  if (!exercise.description || exercise.description.length < 50) {
    indicators.push({ label: "Krótki opis", type: "warning" });
  }
  if (!exercise.mainTags || exercise.mainTags.length === 0) {
    indicators.push({ label: "Brak tagów", type: "warning" });
  }
  
  return indicators;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "przed chwilą";
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return `${Math.floor(diffDays / 7)} tyg. temu`;
}

export function VerificationTaskCard({ exercise, className }: VerificationTaskCardProps) {
  const imageUrl = getMediaUrl(exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0]);
  const statusBadge = getStatusBadge(exercise.status);
  const qualityIndicators = getQualityIndicators(exercise);
  const hasWarnings = qualityIndicators.some(i => i.type === "warning");

  return (
    <Link href={`/verification/${exercise.id}`}>
      <Card
        data-testid={`verification-card-${exercise.id}`}
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
          hasWarnings && "border-amber-500/30",
          className
        )}
      >
        <CardContent className="p-0">
          {/* Image section */}
          <div className="relative aspect-video overflow-hidden bg-surface-light">
            {imageUrl ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <img
                  src={imageUrl}
                  alt={exercise.name}
                  loading="lazy"
                  className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </>
            ) : (
              <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-12 w-12" />
            )}
            
            {/* Status badge overlay */}
            <div className="absolute top-3 left-3">
              <Badge className={cn("border", statusBadge.className)}>
                {statusBadge.label}
              </Badge>
            </div>

            {/* Quality warnings overlay */}
            {qualityIndicators.length > 0 && (
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {qualityIndicators.slice(0, 2).map((indicator, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5 backdrop-blur-sm",
                      indicator.type === "warning"
                        ? "bg-amber-500/80 text-white border-amber-600"
                        : "bg-info/80 text-white border-info"
                    )}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {indicator.label}
                  </Badge>
                ))}
                {qualityIndicators.length > 2 && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/80 backdrop-blur-sm">
                    +{qualityIndicators.length - 2} więcej
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Content section */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {exercise.name}
              </h3>
              {exercise.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {exercise.description}
                </p>
              )}
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {exercise.createdBy && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">
                      {exercise.createdBy.fullname || exercise.createdBy.email}
                    </span>
                  </div>
                )}
                {exercise.createdAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(exercise.createdAt)}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
