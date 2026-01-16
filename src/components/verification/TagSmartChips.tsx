"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Tag,
  Plus,
  X,
  Sparkles,
  Loader2,
  Search,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MAIN_TAGS,
  ADDITIONAL_TAGS,
  getTagCategoryColor,
  getTagCategory,
  searchTags,
  getSuggestedTags,
} from "@/data/anatomical-dictionary";

interface TagSmartChipsProps {
  /** ID ćwiczenia (dla AI cache) */
  exerciseId: string;
  /** Nazwa ćwiczenia (dla kontekstu AI) */
  exerciseName: string;
  /** Opis ćwiczenia (dla kontekstu AI) */
  exerciseDescription?: string;
  /** Aktualne tagi */
  tags: string[];
  /** Callback przy zmianie tagów */
  onTagsChange: (tags: string[]) => Promise<void>;
  /** Typ tagów: main lub additional */
  tagType: "main" | "additional";
  /** Etykieta */
  label: string;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

type AIStatus = "idle" | "loading" | "loaded" | "error";

/**
 * TagSmartChips - Tagi z ON-DEMAND AI suggestions
 *
 * Zasada: Koszt AI generowany TYLKO gdy użytkownik kliknie przycisk "Zasugeruj (AI)"
 *
 * Flow:
 * 1. Użytkownik widzi aktualne tagi
 * 2. Może dodać tag ze słownika (Combobox)
 * 3. Może kliknąć "Zasugeruj (AI)" - wtedy dopiero generowany jest koszt
 * 4. Sugestie AI wyświetlane jako "Ghost Chips" (półprzezroczyste)
 * 5. Kliknięcie w Ghost Chip = akceptacja tagu
 */
export function TagSmartChips({
  exerciseId,
  exerciseName,
  exerciseDescription,
  tags,
  onTagsChange,
  tagType,
  label,
  disabled = false,
  className,
  "data-testid": testId,
}: TagSmartChipsProps) {
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // AI suggestions state - ładowane TYLKO gdy user kliknie
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");

  // Słownik tagów zależny od typu
  const dictionary = useMemo(
    () => (tagType === "main" ? [...MAIN_TAGS] : [...ADDITIONAL_TAGS]),
    [tagType]
  );

  // Filtrowane tagi do wyboru (bez już wybranych)
  const availableTags = useMemo(
    () => dictionary.filter((tag) => !tags.includes(tag)),
    [dictionary, tags]
  );

  // Wyszukiwanie w słowniku
  const filteredTags = useMemo(
    () => searchTags(searchQuery, availableTags as readonly string[]),
    [searchQuery, availableTags]
  );

  // Sugestie na podstawie wybranych tagów (lokalne, bez AI)
  const localSuggestions = useMemo(
    () => getSuggestedTags(tags).filter((s) => !tags.includes(s)).slice(0, 3),
    [tags]
  );

  // Ghost chips = sugestie AI które nie są jeszcze dodane
  const ghostChips = useMemo(
    () => aiSuggestions?.filter((s) => !tags.includes(s)) || [],
    [aiSuggestions, tags]
  );

  // ON-DEMAND: Koszt generowany TYLKO gdy user kliknie przycisk
  const handleRequestAISuggestions = useCallback(async () => {
    setAiStatus("loading");

    try {
      // Wywołanie API on-demand
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/verification/suggest-tags/${exerciseId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Auth headers będą dodane przez interceptor
          },
          body: JSON.stringify({
            exerciseName,
            exerciseDescription,
            tagType,
            existingTags: tags,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Nie udało się wygenerować sugestii");
      }

      const data = await response.json();
      const suggestions = tagType === "main"
        ? data.mainTags || []
        : data.additionalTags || [];

      setAiSuggestions(suggestions);
      setAiStatus("loaded");

      if (suggestions.length === 0) {
        toast.info("AI nie ma dodatkowych sugestii dla tego ćwiczenia");
      }
    } catch (error) {
      console.error("AI suggestions error:", error);
      setAiStatus("error");
      toast.error("Nie udało się wygenerować sugestii AI");

      // Reset po błędzie
      setTimeout(() => setAiStatus("idle"), 3000);
    }
  }, [exerciseId, exerciseName, exerciseDescription, tagType, tags]);

  // Dodaj tag
  const handleAddTag = useCallback(
    async (tag: string) => {
      if (tags.includes(tag)) return;

      try {
        await onTagsChange([...tags, tag]);
      } catch (error) {
        console.error("Add tag error:", error);
        toast.error("Nie udało się dodać tagu");
      }
    },
    [tags, onTagsChange]
  );

  // Usuń tag
  const handleRemoveTag = useCallback(
    async (tag: string) => {
      try {
        await onTagsChange(tags.filter((t) => t !== tag));
      } catch (error) {
        console.error("Remove tag error:", error);
        toast.error("Nie udało się usunąć tagu");
      }
    },
    [tags, onTagsChange]
  );

  // Grupuj tagi według kategorii dla lepszego wyświetlania
  const groupedFilteredTags = useMemo(() => {
    const groups: Record<string, string[]> = {};

    for (const tag of filteredTags) {
      const category = getTagCategory(tag) || "Inne";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tag);
    }

    return groups;
  }, [filteredTags]);

  return (
    <div className={cn("space-y-3", className)} data-testid={testId}>
      {/* Header z label i przyciskami */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4 text-primary" />
          {label}
          {tags.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {tags.length}
            </Badge>
          )}
        </Label>

        <div className="flex gap-2">
          {/* Przycisk AI - KOSZT tylko gdy kliknięty */}
          {aiStatus !== "loaded" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              onClick={handleRequestAISuggestions}
              disabled={disabled || aiStatus === "loading"}
              data-testid={`${testId}-ai-btn`}
            >
              {aiStatus === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generuję...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Zasugeruj (AI)
                </>
              )}
            </Button>
          )}

          {/* Przycisk dodawania ze słownika */}
          <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                disabled={disabled}
                data-testid={`${testId}-add-btn`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Szukaj tagu..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>Nie znaleziono tagów</CommandEmpty>

                  {/* Lokalne sugestie (bez AI) */}
                  {localSuggestions.length > 0 && (
                    <>
                      <CommandGroup heading="Sugerowane">
                        {localSuggestions.map((tag) => (
                          <CommandItem
                            key={tag}
                            onSelect={() => {
                              handleAddTag(tag);
                              setIsComboboxOpen(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center justify-between"
                          >
                            <span className="truncate">{tag}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] ml-2 shrink-0",
                                getTagCategoryColor(tag)
                              )}
                            >
                              {getTagCategory(tag)}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}

                  {/* Wszystkie tagi pogrupowane */}
                  {Object.entries(groupedFilteredTags).map(([category, categoryTags]) => (
                    <CommandGroup key={category} heading={category}>
                      {categoryTags.slice(0, 10).map((tag) => (
                        <CommandItem
                          key={tag}
                          onSelect={() => {
                            handleAddTag(tag);
                            setIsComboboxOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          {tag}
                        </CommandItem>
                      ))}
                      {categoryTags.length > 10 && (
                        <div className="px-2 py-1 text-xs text-muted-foreground">
                          +{categoryTags.length - 10} więcej...
                        </div>
                      )}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Aktywne tagi */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && ghostChips.length === 0 && (
          <span className="text-sm text-muted-foreground italic">
            Brak tagów. Kliknij "Dodaj" lub "Zasugeruj (AI)".
          </span>
        )}

        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={cn(
              "pr-1 gap-1.5 transition-all",
              getTagCategoryColor(tag)
            )}
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={disabled}
              className="ml-1 h-4 w-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"
              data-testid={`${testId}-remove-${tag.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Ghost chips - widoczne TYLKO po kliknięciu "Zasugeruj (AI)" */}
        {ghostChips.map((tag) => (
          <button
            key={tag}
            onClick={() => handleAddTag(tag)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
              "border-2 border-dashed border-amber-500/40",
              "text-amber-600 text-sm",
              "hover:bg-amber-500/10 hover:border-amber-500/60",
              "transition-colors cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            data-testid={`${testId}-ghost-${tag.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <Sparkles className="h-3 w-3" />
            {tag}
            <Check className="h-3 w-3 opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>

      {/* Info o cache AI */}
      {aiStatus === "loaded" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Sugestie AI zapisane - następnym razem załadują się natychmiast
        </p>
      )}

      {aiStatus === "error" && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          Błąd generowania sugestii. Spróbuj ponownie.
        </p>
      )}
    </div>
  );
}

/**
 * TagSmartChipsReadOnly - Wersja tylko do odczytu
 */
interface TagSmartChipsReadOnlyProps {
  tags: string[];
  label?: string;
  className?: string;
}

export function TagSmartChipsReadOnly({
  tags,
  label,
  className,
}: TagSmartChipsReadOnlyProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4 text-primary" />
          {label}
        </Label>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-sm text-muted-foreground italic">Brak tagów</span>
        ) : (
          tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn("transition-all", getTagCategoryColor(tag))}
            >
              {tag}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
