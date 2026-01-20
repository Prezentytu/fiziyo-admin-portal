"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  Frame,
  Volume2,
  RefreshCw,
  Shield,
  FileText,
  Tag,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface QualityChecklistProps {
  exercise: AdminExercise;
  checks: QualityChecks;
  onChecksChange: (checks: QualityChecks) => void;
  /** Notatki wewnętrzne (gdy coś jest nie tak) */
  internalNotes?: string;
  /** Callback przy zmianie notatek */
  onInternalNotesChange?: (notes: string) => void;
  /** Wariant wyświetlania */
  variant?: "full" | "compact";
  className?: string;
  "data-testid"?: string;
}

/**
 * Rozszerzone checky jakości - hybrid 8 elementów
 */
export interface QualityChecks {
  // Kliniczne
  clinicallyCorrect: boolean | null;
  safety: boolean | null;
  // Media
  videoQuality: boolean | null;
  framing: boolean | null;
  audioQuality: boolean | null;
  loopSmooth: boolean | null;
  // Treść
  descriptionComplete: boolean | null;
  tagsAppropriate: boolean | null;
}

interface CheckItemProps {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  value: boolean | null;
  onChange: (value: boolean) => void;
  autoDetected?: "pass" | "warning" | "fail" | null;
  /** Compact mode - grid cell */
  compact?: boolean;
}

function CheckItem({
  id,
  label,
  description,
  icon,
  value,
  onChange,
  autoDetected,
  compact = false,
}: CheckItemProps) {
  // Compact mode - grid cell with toggle
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onChange(value !== true)}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
          value === true && "bg-emerald-500/10 border-emerald-500/30",
          value === false && "bg-destructive/10 border-destructive/30",
          value === null && "bg-surface border-border/40 hover:border-border"
        )}
        data-testid={`verification-checklist-${id}`}
      >
        {/* Status icon */}
        <div
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
            value === true && "bg-emerald-500/20 text-emerald-500",
            value === false && "bg-destructive/20 text-destructive",
            value === null && "bg-muted text-muted-foreground"
          )}
        >
          {value === true && <CheckCircle2 className="h-3 w-3" />}
          {value === false && <XCircle className="h-3 w-3" />}
          {value === null && icon}
        </div>

        {/* Label */}
        <span
          className={cn(
            "text-xs font-medium truncate",
            value === true && "text-emerald-600",
            value === false && "text-destructive",
            value === null && "text-foreground"
          )}
        >
          {label}
        </span>

        {/* Auto-detect badge */}
        {autoDetected && value === null && (
          <span
            className={cn(
              "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
              autoDetected === "pass" && "bg-emerald-500/20 text-emerald-600",
              autoDetected === "warning" && "bg-amber-500/20 text-amber-600",
              autoDetected === "fail" && "bg-destructive/20 text-destructive"
            )}
          >
            {autoDetected === "pass" ? "OK" : autoDetected === "warning" ? "?" : "!"}
          </span>
        )}
      </button>
    );
  }

  // Full mode - list item with switch
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
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
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
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
          data-testid={`verification-checklist-${id}-switch`}
        />
      </div>
    </div>
  );
}

export function QualityChecklist({
  exercise,
  checks,
  onChecksChange,
  internalNotes = "",
  onInternalNotesChange,
  variant = "full",
  className,
  "data-testid": testId,
}: QualityChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-detect quality issues
  const hasMedia = !!(exercise.videoUrl || exercise.gifUrl || exercise.imageUrl || exercise.images?.length);
  const hasDescription = !!(
    (exercise.patientDescription && exercise.patientDescription.length >= 50) ||
    (exercise.description && exercise.description.length >= 50)
  );
  const hasTags = !!(exercise.mainTags && exercise.mainTags.length > 0);

  const videoAutoDetect = hasMedia ? "pass" : "fail";
  const descriptionAutoDetect = hasDescription ? "pass" : exercise.patientDescription || exercise.description ? "warning" : "fail";
  const tagsAutoDetect = hasTags ? "pass" : "fail";

  const handleChange = (key: keyof QualityChecks, value: boolean) => {
    onChecksChange({ ...checks, [key]: value });
  };

  // Count completed checks
  const totalChecks = Object.keys(checks).length;
  const completedCount = Object.values(checks).filter((v) => v !== null).length;
  const passedCount = Object.values(checks).filter((v) => v === true).length;
  const failedCount = Object.values(checks).filter((v) => v === false).length;

  // Show notes field if any check is failed
  const showNotes = failedCount > 0;

  // Compact variant - grid layout
  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)} data-testid={testId}>
        {/* Header */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Weryfikacja Techniczna</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  passedCount === totalChecks
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : failedCount > 0
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {passedCount}/{totalChecks}
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-2">
            {/* Grid 2x4 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <CheckItem
                id="clinical"
                label="Technika"
                icon={<Stethoscope className="h-3 w-3" />}
                value={checks.clinicallyCorrect}
                onChange={(v) => handleChange("clinicallyCorrect", v)}
                compact
              />
              <CheckItem
                id="safety"
                label="Bezpieczeństwo"
                icon={<Shield className="h-3 w-3" />}
                value={checks.safety}
                onChange={(v) => handleChange("safety", v)}
                compact
              />
              <CheckItem
                id="video"
                label="Wideo"
                icon={<Video className="h-3 w-3" />}
                value={checks.videoQuality}
                onChange={(v) => handleChange("videoQuality", v)}
                autoDetected={videoAutoDetect}
                compact
              />
              <CheckItem
                id="framing"
                label="Kadrowanie"
                icon={<Frame className="h-3 w-3" />}
                value={checks.framing}
                onChange={(v) => handleChange("framing", v)}
                compact
              />
              <CheckItem
                id="audio"
                label="Audio"
                icon={<Volume2 className="h-3 w-3" />}
                value={checks.audioQuality}
                onChange={(v) => handleChange("audioQuality", v)}
                compact
              />
              <CheckItem
                id="loop"
                label="Pętla"
                icon={<RefreshCw className="h-3 w-3" />}
                value={checks.loopSmooth}
                onChange={(v) => handleChange("loopSmooth", v)}
                compact
              />
              <CheckItem
                id="description"
                label="Opis"
                icon={<FileText className="h-3 w-3" />}
                value={checks.descriptionComplete}
                onChange={(v) => handleChange("descriptionComplete", v)}
                autoDetected={descriptionAutoDetect}
                compact
              />
              <CheckItem
                id="tags"
                label="Tagi"
                icon={<Tag className="h-3 w-3" />}
                value={checks.tagsAppropriate}
                onChange={(v) => handleChange("tagsAppropriate", v)}
                autoDetected={tagsAutoDetect}
                compact
              />
            </div>

            {/* Internal notes (when something is wrong) */}
            {showNotes && onInternalNotesChange && (
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Notatki wewnętrzne (co jest nie tak?)
                </Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => onInternalNotesChange(e.target.value)}
                  placeholder="Opisz problemy z jakością..."
                  rows={2}
                  className="text-sm resize-none"
                  data-testid="quality-checklist-notes"
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Quick summary when collapsed */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(checks).map(([key, value]) => (
              <span
                key={key}
                className={cn(
                  "w-2 h-2 rounded-full",
                  value === true && "bg-emerald-500",
                  value === false && "bg-destructive",
                  value === null && "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant - card with list
  return (
    <Card className={cn("border-border/60", className)} data-testid={testId}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Checklista Jakości
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {passedCount}/{totalChecks} spełnionych
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/40">
          <CheckItem
            id="clinical"
            label="Technika jest poprawna klinicznie"
            description="Ćwiczenie jest bezpieczne i zgodne ze standardami fizjoterapii"
            icon={<Stethoscope className="h-4 w-4" />}
            value={checks.clinicallyCorrect}
            onChange={(v) => handleChange("clinicallyCorrect", v)}
          />
          <CheckItem
            id="safety"
            label="Bezpieczeństwo wykonania"
            description="Ruch jest bezpieczny i nie stwarza ryzyka kontuzji"
            icon={<Shield className="h-4 w-4" />}
            value={checks.safety}
            onChange={(v) => handleChange("safety", v)}
          />
          <CheckItem
            id="video"
            label="Jakość wideo"
            description="Wideo jest czytelne, dobrze oświetlone i profesjonalne"
            icon={<Video className="h-4 w-4" />}
            value={checks.videoQuality}
            onChange={(v) => handleChange("videoQuality", v)}
            autoDetected={videoAutoDetect}
          />
          <CheckItem
            id="framing"
            label="Kadrowanie"
            description="Cały ruch jest widoczny, bez ucięć"
            icon={<Frame className="h-4 w-4" />}
            value={checks.framing}
            onChange={(v) => handleChange("framing", v)}
          />
          <CheckItem
            id="audio"
            label="Jakość audio"
            description="Dźwięk jest czysty, bez szumów"
            icon={<Volume2 className="h-4 w-4" />}
            value={checks.audioQuality}
            onChange={(v) => handleChange("audioQuality", v)}
          />
          <CheckItem
            id="loop"
            label="Płynność pętli"
            description="Wideo płynnie się zapętla bez skoków"
            icon={<RefreshCw className="h-4 w-4" />}
            value={checks.loopSmooth}
            onChange={(v) => handleChange("loopSmooth", v)}
          />
          <CheckItem
            id="description"
            label="Opis jest kompletny"
            description="Instrukcje są jasne i zrozumiałe dla pacjenta"
            icon={<FileText className="h-4 w-4" />}
            value={checks.descriptionComplete}
            onChange={(v) => handleChange("descriptionComplete", v)}
            autoDetected={descriptionAutoDetect}
          />
          <CheckItem
            id="tags"
            label="Tagi są odpowiednie"
            description="Ćwiczenie jest poprawnie skategoryzowane"
            icon={<Tag className="h-4 w-4" />}
            value={checks.tagsAppropriate}
            onChange={(v) => handleChange("tagsAppropriate", v)}
            autoDetected={tagsAutoDetect}
          />
        </div>

        {/* Internal notes (when something is wrong) */}
        {showNotes && onInternalNotesChange && (
          <div className="mt-4 space-y-2">
            <Label className="text-sm text-muted-foreground">
              Notatki wewnętrzne (co jest nie tak?)
            </Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => onInternalNotesChange(e.target.value)}
              placeholder="Opisz problemy z jakością..."
              rows={3}
              className="resize-none"
              data-testid="quality-checklist-notes-full"
            />
          </div>
        )}

        {/* Summary */}
        {completedCount === totalChecks && (
          <div
            className={cn(
              "mt-4 p-3 rounded-xl text-sm",
              passedCount === totalChecks
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            )}
          >
            {passedCount === totalChecks
              ? "Wszystkie kryteria spełnione. Ćwiczenie gotowe do zatwierdzenia!"
              : `${totalChecks - passedCount} kryteriów niespełnionych. Rozważ odrzucenie z uwagami.`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
