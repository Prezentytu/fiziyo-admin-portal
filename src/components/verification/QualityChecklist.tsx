"use client";

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface QualityChecklistProps {
  exercise: AdminExercise;
  checks: QualityChecks;
  onChecksChange: (checks: QualityChecks) => void;
  className?: string;
}

export interface QualityChecks {
  clinicallyCorrect: boolean | null;
  mediaQuality: boolean | null;
  descriptionComplete: boolean | null;
  tagsAppropriate: boolean | null;
}

interface CheckItemProps {
  id: string;
  label: string;
  description: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  autoDetected?: "pass" | "warning" | "fail" | null;
}

function CheckItem({ id, label, description, value, onChange, autoDetected }: CheckItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="font-medium text-foreground cursor-pointer">
            {label}
          </Label>
          {autoDetected && (
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                autoDetected === "pass" && "bg-emerald-500/10 text-emerald-500",
                autoDetected === "warning" && "bg-amber-500/10 text-amber-500",
                autoDetected === "fail" && "bg-destructive/10 text-destructive"
              )}
            >
              {autoDetected === "pass" && <CheckCircle2 className="h-3 w-3" />}
              {autoDetected === "warning" && <AlertCircle className="h-3 w-3" />}
              {autoDetected === "fail" && <XCircle className="h-3 w-3" />}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {value !== null && (
          <span
            className={cn(
              "text-xs font-medium",
              value ? "text-emerald-500" : "text-destructive"
            )}
          >
            {value ? "Tak" : "Nie"}
          </span>
        )}
        <Switch
          id={id}
          checked={value === true}
          onCheckedChange={onChange}
          data-testid={`verification-checklist-${id}`}
        />
      </div>
    </div>
  );
}

export function QualityChecklist({
  exercise,
  checks,
  onChecksChange,
  className,
}: QualityChecklistProps) {
  // Auto-detect quality issues
  const hasMedia = !!(exercise.videoUrl || exercise.gifUrl || exercise.imageUrl || exercise.images?.length);
  const hasDescription = !!(exercise.description && exercise.description.length >= 50);
  const hasTags = !!(exercise.mainTags && exercise.mainTags.length > 0);

  const mediaAutoDetect = hasMedia ? "pass" : "fail";
  const descriptionAutoDetect = hasDescription ? "pass" : exercise.description ? "warning" : "fail";
  const tagsAutoDetect = hasTags ? "pass" : "fail";

  const handleChange = (key: keyof QualityChecks, value: boolean) => {
    onChecksChange({ ...checks, [key]: value });
  };

  // Count completed checks
  const completedCount = Object.values(checks).filter((v) => v !== null).length;
  const passedCount = Object.values(checks).filter((v) => v === true).length;

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Checklista Jakości
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {passedCount}/{Object.keys(checks).length} spełnionych
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/40">
          <CheckItem
            id="clinical"
            label="Technika jest poprawna klinicznie"
            description="Ćwiczenie jest bezpieczne i zgodne ze standardami fizjoterapii"
            value={checks.clinicallyCorrect}
            onChange={(v) => handleChange("clinicallyCorrect", v)}
            autoDetected={null} // Can't auto-detect clinical correctness
          />
          <CheckItem
            id="media"
            label="Media są wysokiej jakości"
            description="Wideo/obrazy są czytelne, dobrze oświetlone i profesjonalne"
            value={checks.mediaQuality}
            onChange={(v) => handleChange("mediaQuality", v)}
            autoDetected={mediaAutoDetect}
          />
          <CheckItem
            id="description"
            label="Opis jest kompletny"
            description="Instrukcje są jasne i zrozumiałe dla pacjenta"
            value={checks.descriptionComplete}
            onChange={(v) => handleChange("descriptionComplete", v)}
            autoDetected={descriptionAutoDetect}
          />
          <CheckItem
            id="tags"
            label="Tagi są odpowiednie"
            description="Ćwiczenie jest poprawnie skategoryzowane"
            value={checks.tagsAppropriate}
            onChange={(v) => handleChange("tagsAppropriate", v)}
            autoDetected={tagsAutoDetect}
          />
        </div>

        {/* Summary */}
        {completedCount === Object.keys(checks).length && (
          <div
            className={cn(
              "mt-4 p-3 rounded-xl text-sm",
              passedCount === Object.keys(checks).length
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            )}
          >
            {passedCount === Object.keys(checks).length
              ? "Wszystkie kryteria spełnione. Ćwiczenie gotowe do zatwierdzenia!"
              : `${Object.keys(checks).length - passedCount} kryteriów niespełnionych. Rozważ odrzucenie z uwagami.`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
