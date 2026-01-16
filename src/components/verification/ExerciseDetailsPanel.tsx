"use client";

import { useState, useCallback } from "react";
import {
  Dumbbell,
  Timer,
  RotateCcw,
  ArrowLeftRight,
  Image as ImageIcon,
  Video,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getMediaUrls } from "@/utils/mediaUrl";
import { InlineEditField, InlineEditSelect } from "./InlineEditField";
import { ClickableStat, ClickableStatGroup } from "./ClickableStat";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

// Types & Options
const EXERCISE_TYPES = [
  { value: "reps", label: "Powtórzenia", icon: <RotateCcw className="h-4 w-4" /> },
  { value: "time", label: "Czasowe", icon: <Timer className="h-4 w-4" /> },
  { value: "hold", label: "Izometryczne", icon: <Dumbbell className="h-4 w-4" /> },
];

const EXERCISE_SIDES = [
  { value: "none", label: "Brak strony", icon: <span className="w-4" /> },
  { value: "left", label: "Lewa strona", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { value: "right", label: "Prawa strona", icon: <ArrowLeftRight className="h-4 w-4 rotate-180" /> },
  { value: "both", label: "Obie strony", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { value: "alternating", label: "Naprzemiennie", icon: <ArrowLeftRight className="h-4 w-4" /> },
];

interface ExerciseDetailsPanelProps {
  /** Ćwiczenie do edycji */
  exercise: AdminExercise;
  /** Callback przy zmianie pola - ASYNC dla optimistic UI */
  onFieldChange: (field: string, value: unknown) => Promise<void>;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** Czy komponent jest disabled */
  disabled?: boolean;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * ExerciseDetailsPanel - Panel szczegółów ćwiczenia z Inline Editing
 *
 * Zasada "Read First, Edit on Click":
 * - Dane wyświetlane jako tekst
 * - Kliknięcie w pole = edycja inline
 * - Optimistic UI - zmiany widoczne natychmiast
 *
 * Struktura wizualna:
 * - Header: Nazwa (H2)
 * - Meta: Typ, Strona (inline selects)
 * - Metrics: Kafelki z dużymi liczbami (Serie/Powt/Czas)
 * - Advanced: Collapsible z dodatkowymi opcjami
 */
export function ExerciseDetailsPanel({
  exercise,
  onFieldChange,
  className,
  disabled = false,
  "data-testid": testId,
}: ExerciseDetailsPanelProps) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const allImages = getMediaUrls([
    exercise.thumbnailUrl,
    exercise.imageUrl,
    ...(exercise.images || []),
  ]);

  // Generic field change handler
  const handleFieldCommit = useCallback(
    (field: string) => async (value: unknown) => {
      await onFieldChange(field, value);
    },
    [onFieldChange]
  );

  return (
    <Card className={cn("border-border/60", className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Szczegóły ćwiczenia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NAME - Inline editable title */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nazwa ćwiczenia</Label>
          <InlineEditField
            value={exercise.name}
            onCommit={handleFieldCommit("name")}
            type="text"
            placeholder="Wpisz nazwę ćwiczenia..."
            disabled={disabled}
            className="text-lg font-semibold"
            data-testid="verification-details-name"
          />
        </div>

        {/* TYPE & SIDE - Inline selects */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ ćwiczenia</Label>
            <InlineEditSelect
              value={exercise.type || "reps"}
              onCommit={handleFieldCommit("type")}
              options={EXERCISE_TYPES}
              placeholder="Wybierz typ"
              disabled={disabled}
              data-testid="verification-details-type"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Strona ciała</Label>
            <InlineEditSelect
              value={exercise.side || "none"}
              onCommit={handleFieldCommit("side")}
              options={EXERCISE_SIDES}
              placeholder="Wybierz stronę"
              disabled={disabled}
              data-testid="verification-details-side"
            />
          </div>
        </div>

        {/* PARAMETERS - Clickable stat cards */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Dumbbell className="h-3 w-3" />
            Parametry domyślne
          </Label>
          <ClickableStatGroup>
            <ClickableStat
              value={exercise.defaultSets ?? null}
              label="Serie"
              min={0}
              max={20}
              onCommit={handleFieldCommit("defaultSets")}
              disabled={disabled}
              data-testid="verification-details-sets"
            />
            <ClickableStat
              value={exercise.defaultReps ?? null}
              label="Powtórzenia"
              min={0}
              max={100}
              onCommit={handleFieldCommit("defaultReps")}
              disabled={disabled}
              data-testid="verification-details-reps"
            />
            <ClickableStat
              value={exercise.defaultDuration ?? null}
              label="Czas"
              unit="s"
              min={0}
              max={600}
              step={5}
              onCommit={handleFieldCommit("defaultDuration")}
              icon={<Timer className="h-4 w-4" />}
              disabled={disabled}
              data-testid="verification-details-duration"
            />
          </ClickableStatGroup>
        </div>

        {/* MEDIA - Collapsible preview */}
        <Collapsible open={isMediaOpen} onOpenChange={setIsMediaOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" data-testid="verification-details-media-toggle">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Media ({allImages.length} zdjęć{exercise.videoUrl ? " + wideo" : ""}{exercise.gifUrl ? " + GIF" : ""})
              </span>
              {isMediaOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="space-y-4">
              {/* Images grid */}
              {allImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.map((img, idx) => (
                    <div
                      key={`${img}-${idx}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border/60 group"
                    >
                      <img
                        src={img}
                        alt={`Zdjęcie ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {idx === 0 && (
                        <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">
                          Główne
                        </Badge>
                      )}
                    </div>
                  ))}
                  <button className="aspect-square rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Dodaj</span>
                  </button>
                </div>
              )}

              {/* Video & GIF links */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    URL Wideo
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/..."
                    defaultValue={exercise.videoUrl || ""}
                    className="text-xs"
                    disabled={disabled}
                    onBlur={(e) => onFieldChange("videoUrl", e.target.value || null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    URL GIF
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    defaultValue={exercise.gifUrl || ""}
                    className="text-xs"
                    disabled={disabled}
                    onBlur={(e) => onFieldChange("gifUrl", e.target.value || null)}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ADVANCED - Collapsible options */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" data-testid="verification-details-advanced-toggle">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Ustawienia zaawansowane
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Przerwa między seriami (s)</Label>
                <InlineEditField
                  value={exercise.defaultRestBetweenSets ?? null}
                  onCommit={handleFieldCommit("defaultRestBetweenSets")}
                  type="number"
                  placeholder="60"
                  min={0}
                  max={300}
                  disabled={disabled}
                  data-testid="verification-details-rest"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tempo (np. 2-1-2)</Label>
                <InlineEditField
                  value={exercise.tempo || ""}
                  onCommit={handleFieldCommit("tempo")}
                  type="text"
                  placeholder="2-1-2"
                  disabled={disabled}
                  data-testid="verification-details-tempo"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Podpowiedź głosowa (audio cue)</Label>
              <InlineEditField
                value={exercise.audioCue || ""}
                onCommit={handleFieldCommit("audioCue")}
                type="text"
                placeholder="Wdech przy opuszczaniu, wydech przy unoszeniu..."
                disabled={disabled}
                data-testid="verification-details-audiocue"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
