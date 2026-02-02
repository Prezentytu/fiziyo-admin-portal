"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Search,
  Loader2,
  Play,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GET_RELATION_CANDIDATES_QUERY,
  SEARCH_EXERCISES_FOR_RELATION_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import type {
  ExerciseRelationTarget,
  RelationCandidate,
  DifficultyLevel,
  GetRelationCandidatesResponse,
  SearchExercisesForRelationResponse,
} from "@/graphql/types/adminExercise.types";

// Difficulty colors
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  BEGINNER: "bg-emerald-500/10 text-emerald-600",
  EASY: "bg-green-500/10 text-green-600",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  HARD: "bg-orange-500/10 text-orange-600",
  EXPERT: "bg-red-500/10 text-red-600",
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  BEGINNER: "Początkujący",
  EASY: "Łatwy",
  MEDIUM: "Średni",
  HARD: "Trudny",
  EXPERT: "Ekspert",
};

interface ExerciseSearchPopoverProps {
  /** Trigger element */
  children: React.ReactNode;
  /** ID aktualnego ćwiczenia (do wykluczenia z wyników) */
  currentExerciseId: string;
  /** Typ relacji do wyszukiwania */
  relationType: "regression" | "progression";
  /** Callback przy wyborze ćwiczenia */
  onSelect: (exercise: ExerciseRelationTarget) => void;
  /** Czy popover jest otwarty (controlled) */
  open?: boolean;
  /** Callback przy zmianie stanu otwarcia */
  onOpenChange?: (open: boolean) => void;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * ExerciseSearchPopover - Smart Search dla relacji
 *
 * Funkcje:
 * - Wyszukiwanie w czasie rzeczywistym
 * - AI-suggested candidates na górze
 * - Filtrowanie po podobnych tagach
 * - Podgląd thumbnail na hover
 *
 * Styl: Command Palette (Cmd+K style)
 */
export function ExerciseSearchPopover({
  children,
  currentExerciseId,
  relationType,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  className,
}: ExerciseSearchPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredExercise, setHoveredExercise] = useState<ExerciseRelationTarget | null>(null);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Fetch AI candidates
  const { data: candidatesData, loading: candidatesLoading } = useQuery<GetRelationCandidatesResponse>(
    GET_RELATION_CANDIDATES_QUERY,
    {
      variables: {
        exerciseId: currentExerciseId,
        relationType: relationType.toUpperCase(),
        limit: 5,
      },
      skip: !isOpen,
    }
  );

  // Search exercises
  const { data: searchData, loading: searchLoading } = useQuery<SearchExercisesForRelationResponse>(
    SEARCH_EXERCISES_FOR_RELATION_QUERY,
    {
      variables: {
        query: searchQuery,
        excludeIds: [currentExerciseId],
        limit: 10,
      },
      skip: !isOpen || searchQuery.length < 2,
    }
  );

  const candidates = candidatesData?.relationCandidates?.candidates || [];
  const searchResults: ExerciseRelationTarget[] = searchData?.searchExercisesForRelation || [];

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setHoveredExercise(null);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (exercise: ExerciseRelationTarget) => {
      onSelect(exercise);
      setIsOpen(false);
    },
    [onSelect, setIsOpen]
  );

  const isRegression = relationType === "regression";
  const Icon = isRegression ? ArrowLeft : ArrowRight;
  const title = isRegression
    ? "Wybierz łatwiejszą wersję"
    : "Wybierz trudniejszą wersję";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className={cn("w-[400px] p-0", className)}
        align="start"
        sideOffset={8}
      >
        <Command className="rounded-lg border-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{title}</span>
          </div>

          {/* Search input */}
          <CommandInput
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-0"
          />

          <CommandList className="max-h-[350px]">
            {/* Loading state */}
            {(candidatesLoading || searchLoading) && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            <CommandEmpty>
              {searchQuery.length < 2
                ? "Wpisz min. 2 znaki aby wyszukać"
                : "Nie znaleziono ćwiczeń"}
            </CommandEmpty>

            {/* AI Candidates */}
            {!searchQuery && candidates.length > 0 && (
              <CommandGroup heading="Sugestie AI">
                {candidates.map((candidate) => (
                  <ExerciseCommandItem
                    key={candidate.id}
                    exercise={{
                      id: candidate.id,
                      name: candidate.name,
                      thumbnailUrl: candidate.thumbnailUrl,
                      gifUrl: candidate.gifUrl,
                      difficultyLevel: candidate.difficultyLevel,
                      mainTags: candidate.mainTags,
                    }}
                    isAISuggestion
                    onSelect={handleSelect}
                    onHover={setHoveredExercise}
                  />
                ))}
              </CommandGroup>
            )}

            {/* Search Results */}
            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <>
                {candidates.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Wyniki wyszukiwania">
                  {searchResults.map((exercise) => (
                    <ExerciseCommandItem
                      key={exercise.id}
                      exercise={exercise}
                      onSelect={handleSelect}
                      onHover={setHoveredExercise}
                    />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Preview panel (right side on hover) */}
          {hoveredExercise && (
            <ExercisePreviewPanel exercise={hoveredExercise} />
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Single exercise item in command list
 */
interface ExerciseCommandItemProps {
  exercise: ExerciseRelationTarget;
  confidence?: number;
  reason?: string;
  isAISuggestion?: boolean;
  onSelect: (exercise: ExerciseRelationTarget) => void;
  onHover: (exercise: ExerciseRelationTarget | null) => void;
}

function ExerciseCommandItem({
  exercise,
  confidence,
  reason,
  isAISuggestion,
  onSelect,
  onHover,
}: ExerciseCommandItemProps) {
  return (
    <CommandItem
      value={exercise.id}
      onSelect={() => onSelect(exercise)}
      onMouseEnter={() => onHover(exercise)}
      onMouseLeave={() => onHover(null)}
      className="flex items-center gap-3 py-2 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-zinc-900 shrink-0">
        {exercise.thumbnailUrl || exercise.gifUrl ? (
          <img
            src={exercise.thumbnailUrl || exercise.gifUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-4 w-4 text-muted-foreground opacity-30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{exercise.name}</span>
          {isAISuggestion && (
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {exercise.difficultyLevel && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5 py-0",
                DIFFICULTY_COLORS[exercise.difficultyLevel as DifficultyLevel]
              )}
            >
              {DIFFICULTY_LABELS[exercise.difficultyLevel as DifficultyLevel]}
            </Badge>
          )}
          {exercise.mainTags?.[0] && (
            <span className="text-[10px] text-muted-foreground truncate">
              {exercise.mainTags[0]}
            </span>
          )}
        </div>
        {reason && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {reason}
          </p>
        )}
      </div>

      {/* Confidence */}
      {confidence !== undefined && (
        <Badge
          variant="outline"
          className="text-[9px] shrink-0 border-amber-500/40 text-amber-600"
        >
          {Math.round(confidence * 100)}%
        </Badge>
      )}
    </CommandItem>
  );
}

/**
 * Preview panel (shown on hover)
 */
function ExercisePreviewPanel({ exercise }: { exercise: ExerciseRelationTarget }) {
  const mediaUrl = exercise.gifUrl || exercise.thumbnailUrl;

  return (
    <div className="absolute right-0 top-0 translate-x-full w-[200px] ml-2 p-2 bg-popover border border-border rounded-lg shadow-lg">
      {/* Media */}
      {mediaUrl && (
        <div className="aspect-video rounded-md overflow-hidden bg-zinc-900 mb-2">
          <img
            src={exercise.gifUrl || exercise.thumbnailUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Name */}
      <p className="text-sm font-medium mb-1">{exercise.name}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {exercise.difficultyLevel && (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px]",
              DIFFICULTY_COLORS[exercise.difficultyLevel as DifficultyLevel]
            )}
          >
            {DIFFICULTY_LABELS[exercise.difficultyLevel as DifficultyLevel]}
          </Badge>
        )}
        {exercise.mainTags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[9px]">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/**
 * Standalone search dialog (alternative to popover)
 */
interface ExerciseSearchDialogProps {
  currentExerciseId: string;
  relationType: "regression" | "progression";
  onSelect: (exercise: ExerciseRelationTarget) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseSearchDialog({
  currentExerciseId,
  relationType,
  onSelect,
  open,
  onOpenChange,
}: ExerciseSearchDialogProps) {
  return (
    <ExerciseSearchPopover
      currentExerciseId={currentExerciseId}
      relationType={relationType}
      onSelect={onSelect}
      open={open}
      onOpenChange={onOpenChange}
    >
      <span /> {/* Hidden trigger */}
    </ExerciseSearchPopover>
  );
}
