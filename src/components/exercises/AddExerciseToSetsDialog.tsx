"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Search,
  Loader2,
  Plus,
  FolderPlus,
  ChevronRight,
  Check,
  Sparkles,
  Wand2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useOrganization } from "@/contexts/OrganizationContext";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { aiService } from "@/services/aiService";

// ============================================
// Types
// ============================================

interface ExerciseTag {
  id: string;
  name: string;
  color?: string;
}

interface Exercise {
  id: string;
  name: string;
  type?: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  mainTags?: (string | ExerciseTag)[];
  additionalTags?: (string | ExerciseTag)[];
}

interface ExerciseInSet {
  id: string;
  name: string;
  type?: string;
  mainTags?: string[];
  additionalTags?: string[];
}

interface ExerciseMapping {
  exerciseId: string;
  exercise: ExerciseInSet;
}

interface ExerciseSetFromDB {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  exerciseMappings?: ExerciseMapping[];
}

interface RankedSet {
  set: ExerciseSetFromDB;
  score: number;
  reasoning: string;
  isAlreadyAdded: boolean;
}

interface AddExerciseToSetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
}

type Step = "select-set" | "create-set" | "success";

// ============================================
// Smart Matching Algorithm
// ============================================

function getTagNames(tags: (string | ExerciseTag)[] | undefined): string[] {
  if (!tags) return [];
  return tags.map((tag) => (typeof tag === "string" ? tag : tag.name));
}

function calculateSetRelevance(
  exercise: Exercise,
  exerciseSet: ExerciseSetFromDB
): { score: number; reasoning: string } {
  const exerciseTags = [
    ...getTagNames(exercise.mainTags),
    ...getTagNames(exercise.additionalTags),
  ];

  if (exerciseTags.length === 0 || !exerciseSet.exerciseMappings?.length) {
    return { score: 0, reasoning: "" };
  }

  // Collect all tags from exercises in the set
  const setTags: string[] = [];
  const setTypes: string[] = [];

  exerciseSet.exerciseMappings.forEach((mapping) => {
    if (mapping.exercise) {
      setTags.push(
        ...(mapping.exercise.mainTags || []),
        ...(mapping.exercise.additionalTags || [])
      );
      if (mapping.exercise.type) {
        setTypes.push(mapping.exercise.type);
      }
    }
  });

  // Calculate tag overlap
  const lowerExerciseTags = exerciseTags.map((t) => t.toLowerCase());
  const lowerSetTags = setTags.map((t) => t.toLowerCase());
  const commonTags = lowerExerciseTags.filter((t) => lowerSetTags.includes(t));

  // Score calculation
  let score = 0;
  const reasons: string[] = [];

  // Tag matching (max 70 points)
  if (commonTags.length > 0) {
    const tagScore = Math.min(
      (commonTags.length / lowerExerciseTags.length) * 70,
      70
    );
    score += tagScore;

    // Find original tag names for display
    const displayTags = exerciseTags.filter((t) =>
      commonTags.includes(t.toLowerCase())
    );
    if (displayTags.length === 1) {
      reasons.push(`Wspólny tag: ${displayTags[0]}`);
    } else if (displayTags.length <= 3) {
      reasons.push(`Wspólne tagi: ${displayTags.join(", ")}`);
    } else {
      reasons.push(`${displayTags.length} wspólnych tagów`);
    }
  }

  // Type matching (max 20 points)
  if (exercise.type && setTypes.includes(exercise.type)) {
    score += 20;
    const typeLabel =
      exercise.type === "time"
        ? "czasowe"
        : exercise.type === "reps"
        ? "powtórzeniowe"
        : exercise.type;
    reasons.push(`Ten sam typ: ${typeLabel}`);
  }

  // Set size bonus (max 10 points) - prefer sets with more exercises
  const sizeBonus = Math.min(exerciseSet.exerciseMappings.length * 2, 10);
  score += sizeBonus;

  if (exerciseSet.exerciseMappings.length >= 3 && reasons.length === 0) {
    reasons.push(`Zawiera ${exerciseSet.exerciseMappings.length} ćwiczeń`);
  }

  return {
    score: Math.round(score),
    reasoning: reasons.join(" • ") || "Pasujący zestaw",
  };
}

// ============================================
// Component
// ============================================

export function AddExerciseToSetsDialog({
  open,
  onOpenChange,
  exercise,
}: AddExerciseToSetsDialogProps) {
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState<Step>("select-set");
  const [searchQuery, setSearchQuery] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [aiSuggestedName, setAiSuggestedName] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  const organizationId = currentOrganization?.organizationId;

  // Get exercise sets
  const {
    data: setsData,
    loading: setsLoading,
    refetch: refetchSets,
  } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId || !open,
  });

  // Mutations
  const [createSet, { loading: creatingSet }] = useMutation(
    CREATE_EXERCISE_SET_MUTATION
  );
  const [addExerciseToSet, { loading: addingExercise }] = useMutation(
    ADD_EXERCISE_TO_EXERCISE_SET_MUTATION
  );

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setStep("select-set");
        setSearchQuery("");
        setNewSetName("");
        setAiSuggestedName(null);
        setIsGeneratingName(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Generate AI name suggestion when entering create-set step
  const generateAiName = useCallback(async () => {
    if (!exercise) return;

    setIsGeneratingName(true);
    try {
      const tags = [
        ...getTagNames(exercise.mainTags),
        ...getTagNames(exercise.additionalTags),
      ];

      const prompt = `Zaproponuj krótką, profesjonalną nazwę zestawu ćwiczeń (max 5 słów) zawierającego ćwiczenie: "${exercise.name}". ${
        tags.length > 0 ? `Tagi ćwiczenia: ${tags.join(", ")}.` : ""
      } ${exercise.type ? `Typ: ${exercise.type}.` : ""}`;

      const response = await aiService.generateExerciseSet(prompt, undefined, []);

      if (response?.setName) {
        setAiSuggestedName(response.setName);
        setNewSetName(response.setName);
      }
    } catch (error) {
      console.error("Error generating AI name:", error);
    } finally {
      setIsGeneratingName(false);
    }
  }, [exercise]);

  // Trigger AI generation when entering create step
  useEffect(() => {
    if (step === "create-set" && !aiSuggestedName && !isGeneratingName) {
      generateAiName();
    }
  }, [step, aiSuggestedName, isGeneratingName, generateAiName]);

  // Process and rank exercise sets
  const { rankedSets, recommendedSets, otherSets } = useMemo(() => {
    const sets =
      (setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [];
    const activeSets = sets.filter((s) => s.isActive);

    if (!exercise) {
      return {
        rankedSets: [] as RankedSet[],
        recommendedSets: [] as RankedSet[],
        otherSets: [] as RankedSet[],
      };
    }

    // Calculate relevance for each set
    const ranked: RankedSet[] = activeSets.map((set) => {
      const { score, reasoning } = calculateSetRelevance(exercise, set);
      const isAlreadyAdded =
        set.exerciseMappings?.some((m) => m.exerciseId === exercise.id) || false;

      return { set, score, reasoning, isAlreadyAdded };
    });

    // Sort by score (descending), already added at bottom
    ranked.sort((a, b) => {
      if (a.isAlreadyAdded !== b.isAlreadyAdded) {
        return a.isAlreadyAdded ? 1 : -1;
      }
      return b.score - a.score;
    });

    // Split into recommended (score >= 30) and others
    const recommended = ranked.filter((r) => r.score >= 30 && !r.isAlreadyAdded);
    const others = ranked.filter((r) => r.score < 30 || r.isAlreadyAdded);

    return {
      rankedSets: ranked,
      recommendedSets: recommended.slice(0, 3), // Top 3 recommendations
      otherSets: others,
    };
  }, [setsData, exercise]);

  // Filter sets based on search
  const filteredOtherSets = useMemo(() => {
    if (!searchQuery.trim()) return otherSets;
    const query = searchQuery.toLowerCase();
    return otherSets.filter(
      (r) =>
        r.set.name.toLowerCase().includes(query) ||
        r.set.description?.toLowerCase().includes(query)
    );
  }, [otherSets, searchQuery]);

  // Add to existing set
  const handleAddToSet = useCallback(
    async (setId: string) => {
      if (!exercise || !organizationId) return;

      try {
        await addExerciseToSet({
          variables: {
            exerciseId: exercise.id,
            exerciseSetId: setId,
            order: 1,
            sets: exercise.sets || null,
            reps: exercise.reps || null,
            duration: exercise.duration || null,
          },
          refetchQueries: [
            {
              query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
              variables: { organizationId },
            },
          ],
        });

        const setName = rankedSets.find((r) => r.set.id === setId)?.set.name;
        toast.success(`Dodano "${exercise.name}" do zestawu "${setName}"`);
        setStep("success");
        setTimeout(() => handleOpenChange(false), 1500);
      } catch (error) {
        console.error("Error adding exercise to set:", error);
        const errorMessage = error instanceof Error ? error.message : "";
        if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
          toast.error("Przekroczono limit czasu. Serwer jest przeciążony - spróbuj ponownie.");
        } else {
          toast.error("Nie udało się dodać ćwiczenia do zestawu");
        }
      }
    },
    [exercise, organizationId, addExerciseToSet, rankedSets, handleOpenChange]
  );

  // Create new set and add exercise
  const handleCreateAndAdd = useCallback(async () => {
    if (!exercise || !organizationId || !newSetName.trim()) return;

    try {
      const result = await createSet({
        variables: {
          organizationId,
          name: newSetName.trim(),
          description: "",
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.createExerciseSet?.id;
      if (!newSetId) throw new Error("Failed to create set");

      await addExerciseToSet({
        variables: {
          exerciseId: exercise.id,
          exerciseSetId: newSetId,
          order: 1,
          sets: exercise.sets || null,
          reps: exercise.reps || null,
          duration: exercise.duration || null,
        },
      });

      await refetchSets();

      toast.success(
        `Utworzono zestaw "${newSetName}" i dodano "${exercise.name}"`
      );
      setStep("success");
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (error) {
      console.error("Error creating set:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        toast.error("Przekroczono limit czasu. Serwer jest przeciążony - spróbuj ponownie za chwilę.");
      } else {
        toast.error("Nie udało się utworzyć zestawu. Spróbuj ponownie.");
      }
    }
  }, [
    exercise,
    organizationId,
    newSetName,
    createSet,
    addExerciseToSet,
    refetchSets,
    handleOpenChange,
  ]);

  const isLoading = setsLoading;
  const isSaving = creatingSet || addingExercise;

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "create-set"
              ? "Utwórz nowy zestaw"
              : step === "success"
              ? "Dodano!"
              : "Dodaj do zestawu"}
          </DialogTitle>
          <DialogDescription>
            {step === "create-set"
              ? `Nowy zestaw z ćwiczeniem "${exercise.name}"`
              : step === "success"
              ? "Ćwiczenie zostało dodane do zestawu"
              : `Wybierz zestaw dla "${exercise.name}"`}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Success state */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in-50 duration-300">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-in fade-in duration-500">
              Gotowe! Ćwiczenie dodane do zestawu.
            </p>
          </div>
        )}

        {/* Select set step */}
        {!isLoading && step === "select-set" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* AI Recommendations Section */}
            {recommendedSets.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Asystent AI Rekomenduje
                  </span>
                </div>

                <div className="space-y-1.5">
                  {recommendedSets.map((ranked) => (
                    <button
                      key={ranked.set.id}
                      onClick={() => handleAddToSet(ranked.set.id)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-purple-500/5 p-3 text-left transition-all hover:border-violet-500/50 hover:from-violet-500/10 hover:to-purple-500/10 cursor-pointer group"
                    >
                      {/* Score badge */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm shrink-0">
                        {ranked.score}%
                      </div>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-medium truncate max-w-full">{ranked.set.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-full">
                          {ranked.reasoning}
                        </p>
                      </div>

                      <TrendingUp className="h-4 w-4 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create new with AI button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-dashed border-primary/50 hover:bg-primary/5 hover:border-primary"
              onClick={() => setStep("create-set")}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-emerald-500/20">
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Utwórz nowy zestaw z AI</p>
                <p className="text-xs text-muted-foreground">
                  AI zaproponuje nazwę zestawu
                </p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            {/* Separator */}
            {(recommendedSets.length > 0 || filteredOtherSets.length > 0) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    {recommendedSets.length > 0
                      ? "Pozostałe zestawy"
                      : "Wszystkie zestawy"}
                  </span>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj zestawów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            {/* Other sets list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {filteredOtherSets.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono zestawów"
                      : rankedSets.length === 0
                      ? "Brak zestawów - utwórz pierwszy!"
                      : "Wszystkie zestawy są w rekomendacjach"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredOtherSets.map((ranked) => {
                    const exerciseCount =
                      ranked.set.exerciseMappings?.length || 0;

                    return (
                      <button
                        key={ranked.set.id}
                        onClick={() =>
                          !ranked.isAlreadyAdded && handleAddToSet(ranked.set.id)
                        }
                        disabled={ranked.isAlreadyAdded || isSaving}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          ranked.isAlreadyAdded
                            ? "border-primary/20 bg-primary/5 cursor-not-allowed"
                            : "border-border hover:border-primary/40 hover:bg-surface-light cursor-pointer"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                            ranked.isAlreadyAdded
                              ? "bg-primary/20"
                              : "bg-surface-light"
                          )}
                        >
                          {ranked.isAlreadyAdded ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p
                            className={cn(
                              "font-medium truncate max-w-full",
                              ranked.isAlreadyAdded && "text-primary"
                            )}
                          >
                            {ranked.set.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ranked.isAlreadyAdded
                              ? "Już dodane"
                              : `${exerciseCount} ćwiczeń`}
                          </p>
                        </div>

                        {!ranked.isAlreadyAdded && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Create set step */}
        {!isLoading && step === "create-set" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nazwa zestawu</label>
              <div className="relative">
                <Input
                  placeholder="np. Ćwiczenia na kręgosłup"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  autoFocus
                  disabled={isGeneratingName}
                />
                {isGeneratingName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {aiSuggestedName && newSetName === aiSuggestedName && (
                <div className="flex items-center gap-2 text-xs text-violet-500">
                  <Sparkles className="h-3 w-3" />
                  <span>Sugestia AI</span>
                </div>
              )}
            </div>

            {/* Quick exercise preview */}
            <div className="rounded-xl border border-border/60 bg-surface/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Ćwiczenie do dodania:
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {exercise.name}
                </Badge>
                {exercise.type && (
                  <Badge variant="outline" className="text-xs">
                    {exercise.type === "time"
                      ? "czasowe"
                      : exercise.type === "reps"
                      ? "powtórzenia"
                      : exercise.type}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("select-set")}>
                Wstecz
              </Button>
              <Button
                onClick={handleCreateAndAdd}
                disabled={!newSetName.trim() || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
                Utwórz i dodaj
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
