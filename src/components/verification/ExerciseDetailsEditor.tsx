"use client";

import { useState } from "react";
import {
  Dumbbell,
  Timer,
  RotateCcw,
  ArrowLeftRight,
  Image as ImageIcon,
  Video,
  Plus,
  X,
  Edit2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getMediaUrl, getMediaUrls } from "@/utils/mediaUrl";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface ExerciseDetailsEditorProps {
  exercise: AdminExercise;
  name: string;
  onNameChange: (name: string) => void;
  exerciseType: string;
  onTypeChange: (type: string) => void;
  exerciseSide: string;
  onSideChange: (side: string) => void;
  sets: number | null;
  onSetsChange: (sets: number | null) => void;
  reps: number | null;
  onRepsChange: (reps: number | null) => void;
  duration: number | null;
  onDurationChange: (duration: number | null) => void;
  restBetweenSets: number | null;
  onRestBetweenSetsChange: (rest: number | null) => void;
  tempo: string;
  onTempoChange: (tempo: string) => void;
  audioCue: string;
  onAudioCueChange: (cue: string) => void;
  className?: string;
}

const EXERCISE_TYPES = [
  { value: "reps", label: "Powtórzenia", icon: RotateCcw },
  { value: "time", label: "Czasowe", icon: Timer },
  { value: "hold", label: "Izometryczne", icon: Dumbbell },
];

const EXERCISE_SIDES = [
  { value: "none", label: "Brak strony" },
  { value: "left", label: "Lewa strona" },
  { value: "right", label: "Prawa strona" },
  { value: "both", label: "Obie strony" },
  { value: "alternating", label: "Naprzemiennie" },
];

export function ExerciseDetailsEditor({
  exercise,
  name,
  onNameChange,
  exerciseType,
  onTypeChange,
  exerciseSide,
  onSideChange,
  sets,
  onSetsChange,
  reps,
  onRepsChange,
  duration,
  onDurationChange,
  restBetweenSets,
  onRestBetweenSetsChange,
  tempo,
  onTempoChange,
  audioCue,
  onAudioCueChange,
  className,
}: ExerciseDetailsEditorProps) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const allImages = getMediaUrls([
    exercise.thumbnailUrl,
    exercise.imageUrl,
    ...(exercise.images || []),
  ]);

  const handleNumberChange = (
    value: string,
    setter: (val: number | null) => void
  ) => {
    if (value === "" || value === null) {
      setter(null);
    } else {
      const num = parseInt(value, 10);
      setter(isNaN(num) ? null : num);
    }
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Edit2 className="h-5 w-5 text-primary" />
          Szczegóły ćwiczenia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="exercise-name">Nazwa ćwiczenia</Label>
          <Input
            id="exercise-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nazwa ćwiczenia..."
            className="font-medium"
          />
        </div>

        {/* Type & Side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Typ ćwiczenia</Label>
            <Select value={exerciseType} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Strona ciała</Label>
            <Select value={exerciseSide} onValueChange={onSideChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz stronę" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_SIDES.map((side) => (
                  <SelectItem key={side.value} value={side.value}>
                    {side.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Parametry domyślne
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Serie</span>
              <Input
                type="number"
                min={0}
                max={20}
                value={sets ?? ""}
                onChange={(e) => handleNumberChange(e.target.value, onSetsChange)}
                placeholder="3"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Powtórzenia</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={reps ?? ""}
                onChange={(e) => handleNumberChange(e.target.value, onRepsChange)}
                placeholder="10"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Czas (s)</span>
              <Input
                type="number"
                min={0}
                max={600}
                value={duration ?? ""}
                onChange={(e) => handleNumberChange(e.target.value, onDurationChange)}
                placeholder="30"
              />
            </div>
          </div>
        </div>

        {/* Media Preview & Edit */}
        <Collapsible open={isMediaOpen} onOpenChange={setIsMediaOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
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
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced Options */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Przerwa między seriami (s)</Label>
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={restBetweenSets ?? ""}
                  onChange={(e) =>
                    handleNumberChange(e.target.value, onRestBetweenSetsChange)
                  }
                  placeholder="60"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tempo (np. 2-1-2)</Label>
                <Input
                  value={tempo}
                  onChange={(e) => onTempoChange(e.target.value)}
                  placeholder="2-1-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Podpowiedź głosowa (audio cue)</Label>
              <Input
                value={audioCue}
                onChange={(e) => onAudioCueChange(e.target.value)}
                placeholder="Wdech przy opuszczaniu, wydech przy unoszeniu..."
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
