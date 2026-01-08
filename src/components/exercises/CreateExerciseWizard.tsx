'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Loader2,
  Dumbbell,
  Check,
  Image,
  Clock,
  Repeat,
  Tag,
  FileText,
  Plus,
  Pause,
  ArrowLeftRight,
  ArrowRight,
  Mic,
  ChevronDown,
  ChevronUp,
  Brain,
  Wand2,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MediaUploadSection } from './MediaUploadSection';
import { TagPicker } from './TagPicker';
import { AIExerciseSuggestions } from './AIExerciseSuggestions';
import { cn } from '@/lib/utils';

import { CREATE_EXERCISE_MUTATION, UPLOAD_EXERCISE_IMAGE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import type { ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import type { CreateExerciseMutationResult, CreateExerciseVariables } from '@/graphql/types/exercise.types';

import { useVoiceInput } from '@/hooks/useVoiceInput';
import { aiService, QUICK_TEMPLATES } from '@/services/aiService';
import type { ExerciseSuggestionResponse, VoiceParseResponse } from '@/types/ai.types';

// Types
type ExerciseType = 'reps' | 'time';
type ExerciseSide = 'none' | 'left' | 'right' | 'both' | 'alternating';

interface ExerciseData {
  name: string;
  description: string;
  type: ExerciseType;
  exerciseSide: ExerciseSide;
  sets: number | null;
  reps: number | null;
  duration: number | null;
  restSets: number | null;
  restReps: number | null;
  preparationTime: number | null;
  executionTime: number | null;
  videoUrl: string;
  gifUrl: string;
  notes: string;
  mainTags: string[];
  additionalTags: string[];
}

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
  isMain?: boolean;
  categoryId?: string;
}

interface CreateExerciseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

const EXERCISE_TYPES: { value: ExerciseType; label: string; icon: React.ElementType }[] = [
  { value: 'reps', label: 'Powtórzenia', icon: Repeat },
  { value: 'time', label: 'Czasowe', icon: Clock },
];

const EXERCISE_SIDES: { value: ExerciseSide; label: string }[] = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'alternating', label: 'Naprzemiennie' },
];

const DEFAULT_DATA: ExerciseData = {
  name: '',
  description: '',
  type: 'reps',
  exerciseSide: 'none',
  sets: 3,
  reps: 10,
  duration: null,
  restSets: 60,
  restReps: null,
  preparationTime: 5,
  executionTime: null,
  videoUrl: '',
  gifUrl: '',
  notes: '',
  mainTags: [],
  additionalTags: [],
};

export function CreateExerciseWizard({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateExerciseWizardProps) {
  const [data, setData] = useState<ExerciseData>(DEFAULT_DATA);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  // AI state
  const [aiSuggestion, setAiSuggestion] = useState<ExerciseSuggestionResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiLoadingType, setAiLoadingType] = useState<'template' | 'voice' | 'suggestion' | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Collapsible sections - params collapsed by default (progressive disclosure)
  const [openSections, setOpenSections] = useState({
    params: false,
    media: false,
    tags: false,
    notes: false,
  });

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get tags from organization
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const tags: ExerciseTag[] = useMemo(() => {
    const rawTags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
    const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

    return rawTags.map((tag) => {
      const category = categories.find((c) => c.id === tag.categoryId);
      return {
        id: tag.id,
        name: tag.name,
        color: category?.color || tag.color || '#6b7280',
        isMain: tag.isMain,
        categoryId: tag.categoryId,
      };
    });
  }, [tagsData, categoriesData]);

  const tagNames = useMemo(() => tags.map(t => t.name), [tags]);

  // Mutations
  const [createExercise] = useMutation<CreateExerciseMutationResult, CreateExerciseVariables>(
    CREATE_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
      ],
    }
  );

  const [uploadImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return (
      data.name !== '' ||
      data.description !== '' ||
      mediaFiles.length > 0 ||
      data.mainTags.length > 0 ||
      data.additionalTags.length > 0
    );
  }, [data, mediaFiles]);

  // Reset form
  const resetForm = useCallback(() => {
    setData(DEFAULT_DATA);
    setMediaFiles([]);
    setAiSuggestion(null);
    setShowAISuggestions(true);
    setOpenSections({ params: false, media: false, tags: false, notes: false });
  }, []);

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  // Focus name input when opened
  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Update data field
  const updateField = useCallback(<K extends keyof ExerciseData>(field: K, value: ExerciseData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Apply parsed exercise from voice input
  const applyVoiceParsed = useCallback((parsed: VoiceParseResponse) => {
    setData((prev) => ({
      ...prev,
      name: parsed.name,
      description: parsed.description,
      type: parsed.type,
      sets: parsed.sets,
      reps: parsed.type === 'reps' ? parsed.reps : null,
      duration: parsed.type !== 'reps' ? parsed.duration : null,
      restSets: parsed.restSets,
      exerciseSide: parsed.exerciseSide,
    }));

    // Auto-select matching tags (params stay collapsed for progressive disclosure)
    if (parsed.suggestedTags.length > 0) {
      const matchingTags = tags.filter(t =>
        parsed.suggestedTags.some(st =>
          t.name.toLowerCase().includes(st.toLowerCase()) ||
          st.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      if (matchingTags.length > 0) {
        updateField('mainTags', matchingTags.slice(0, 3).map(t => t.id));
      }
    }
  }, [tags, updateField]);

  // Voice input hook
  const handleVoiceResult = useCallback(async (text: string) => {
    setIsLoadingAI(true);
    setAiLoadingType('voice');
    try {
      const parsed = await aiService.parseVoiceInput(text);
      if (parsed) {
        applyVoiceParsed(parsed);
        toast.success('Ćwiczenie rozpoznane przez AI');
      } else {
        updateField('name', text);
        toast.info('Nie udało się sparsować szczegółów - uzupełnij ręcznie');
      }
    } catch {
      updateField('name', text);
      toast.error('Błąd AI - wprowadzono tylko nazwę');
    } finally {
      setIsLoadingAI(false);
      setAiLoadingType(null);
    }
  }, [applyVoiceParsed, updateField]);

  const {
    state: voiceState,
    isSupported: voiceSupported,
    interimTranscript,
    toggleListening,
    error: voiceError,
  } = useVoiceInput({
    language: 'pl-PL',
    autoSend: true,
    onSend: handleVoiceResult,
    silenceTimeout: 2000,
  });

  // Apply AI suggestion
  const applyAISuggestion = useCallback(() => {
    if (!aiSuggestion) return;

    setData((prev) => ({
      ...prev,
      description: aiSuggestion.description,
      type: aiSuggestion.type,
      sets: aiSuggestion.sets,
      reps: aiSuggestion.type === 'reps' ? aiSuggestion.reps : null,
      duration: aiSuggestion.type !== 'reps' ? aiSuggestion.duration : null,
      restSets: aiSuggestion.restSets,
      exerciseSide: aiSuggestion.exerciseSide,
    }));

    // Auto-select matching tags (params stay collapsed for progressive disclosure)
    if (aiSuggestion.suggestedTags.length > 0) {
      const matchingTags = tags.filter(t =>
        aiSuggestion.suggestedTags.some(st =>
          t.name.toLowerCase().includes(st.toLowerCase()) ||
          st.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      if (matchingTags.length > 0) {
        updateField('mainTags', matchingTags.slice(0, 3).map(t => t.id));
      }
    }

    setShowAISuggestions(false);
    toast.success('Sugestie AI zastosowane');
  }, [aiSuggestion, tags, updateField]);

  // Fetch AI suggestions when name changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (data.name.length >= 3 && showAISuggestions) {
      debounceRef.current = setTimeout(async () => {
        setIsLoadingAI(true);
        try {
          const suggestion = await aiService.getExerciseSuggestion(data.name, tagNames);
          setAiSuggestion(suggestion);
        } catch {
          console.error('Failed to get AI suggestions');
        } finally {
          setIsLoadingAI(false);
        }
      }, 800);
    } else {
      setAiSuggestion(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [data.name, tagNames, showAISuggestions]);

  // Handle template selection - use AI to suggest based on template category
  const handleTemplateClick = useCallback(async (template: typeof QUICK_TEMPLATES[0]) => {
    setIsLoadingAI(true);
    setAiLoadingType('template');

    try {
      // Use getExerciseSuggestion with template category as exercise name
      const suggestion = await aiService.getExerciseSuggestion(template.category, tagNames);
      if (suggestion) {
        // Apply suggestion and set a generated name based on template
        setData((prev) => ({
          ...prev,
          name: template.label,
          description: suggestion.description,
          type: suggestion.type,
          sets: suggestion.sets,
          reps: suggestion.type === 'reps' ? suggestion.reps : null,
          duration: suggestion.type !== 'reps' ? suggestion.duration : null,
          restSets: suggestion.restSets,
          exerciseSide: suggestion.exerciseSide,
        }));

        // Auto-select matching tags (params stay collapsed for progressive disclosure)
        if (suggestion.suggestedTags.length > 0) {
          const matchingTags = tags.filter(t =>
            suggestion.suggestedTags.some(st =>
              t.name.toLowerCase().includes(st.toLowerCase()) ||
              st.toLowerCase().includes(t.name.toLowerCase())
            )
          );
          if (matchingTags.length > 0) {
            updateField('mainTags', matchingTags.slice(0, 3).map(t => t.id));
          }
        }

        toast.success(`Wygenerowano sugestie dla: ${template.label}`);
      } else {
        // Fallback - just set the name
        updateField('name', template.label);
        toast.info('Uzupełnij szczegóły ćwiczenia');
      }
    } catch {
      updateField('name', template.label);
      toast.error('Błąd AI - wprowadzono tylko nazwę');
    } finally {
      setIsLoadingAI(false);
      setAiLoadingType(null);
    }
  }, [tags, tagNames, updateField]);

  // Check if can generate image
  const canGenerateImage = data.name.trim().length >= 2;

  // State for AI text description (when image generation returns text instead)
  const [aiTextDescription, setAiTextDescription] = useState<string | null>(null);

  // Handle AI image generation
  const handleGenerateImage = useCallback(async () => {
    if (!canGenerateImage) {
      toast.error('Wpisz nazwę ćwiczenia, aby wygenerować obraz');
      return;
    }

    setIsGeneratingImage(true);
    setAiTextDescription(null);

    try {
      // Użyj opisu z formularza lub z sugestii AI (jeśli jest lepsza)
      // Priorytet: opis użytkownika > opis z AI sugestii
      const descriptionForImage = data.description || aiSuggestion?.description || '';

      const result = await aiService.generateExerciseImage(
        data.name,
        descriptionForImage,
        data.type,
        'illustration'
      );

      if (result) {
        // Przypadek 1: Model zwrócił tekst zamiast obrazu
        if (result.response.isTextOnly && result.response.textDescription) {
          setAiTextDescription(result.response.textDescription);
          toast.info('AI wygenerował opis zamiast obrazu', {
            description: 'Możesz użyć go jako opis ćwiczenia.',
            duration: 5000,
          });
          return;
        }

        // Przypadek 2: Mamy obraz
        if (result.file) {
          // Add generated image to files (at the beginning)
          setMediaFiles((prev) => [result.file!, ...prev]);
          // Open media section to show the result
          setOpenSections((prev) => ({ ...prev, media: true }));
          toast.success('Obraz wygenerowany przez AI!', {
            description: 'Możesz go zobaczyć w sekcji Media.',
          });
        }
      } else {
        toast.error('Nie udało się wygenerować obrazu', {
          description: 'Spróbuj ponownie lub dodaj zdjęcie ręcznie.',
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Błąd podczas generowania obrazu');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [canGenerateImage, data.name, data.description, data.type, aiSuggestion?.description]);

  // Handle using AI text description as exercise description
  const handleUseAiDescription = useCallback(() => {
    if (aiTextDescription) {
      updateField('description', aiTextDescription);
      setAiTextDescription(null);
      toast.success('Opis dodany do ćwiczenia');
    }
  }, [aiTextDescription, updateField]);

  // Validation
  const isBasicsValid = data.name.trim().length >= 2;

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Handle save
  const handleSave = async (addAnother = false) => {
    if (!isBasicsValid) {
      toast.error('Podaj nazwę ćwiczenia (min. 2 znaki)');
      nameInputRef.current?.focus();
      return;
    }

    setSaveAndAddAnother(addAnother);
    setIsSaving(true);

    try {
      const result = await createExercise({
        variables: {
          organizationId,
          scope: 'ORGANIZATION',
          name: data.name.trim(),
          description: data.description.trim(),
          type: data.type,
          sets: data.sets,
          reps: data.type === 'reps' ? data.reps : null,
          duration: data.type !== 'reps' ? data.duration : null,
          restSets: data.restSets,
          restReps: data.restReps,
          preparationTime: data.preparationTime,
          executionTime: data.executionTime,
          videoUrl: data.videoUrl || null,
          gifUrl: data.gifUrl || null,
          notes: data.notes || null,
          exerciseSide: data.exerciseSide === 'none' ? null : data.exerciseSide,
          isActive: true,
          mainTags: data.mainTags.length > 0 ? data.mainTags : null,
          additionalTags: data.additionalTags.length > 0 ? data.additionalTags : null,
        },
      });

      const exerciseId = result.data?.createExercise?.id;

      // Upload images if any
      if (exerciseId && mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          try {
            const base64 = await fileToBase64(file);
            await uploadImage({
              variables: {
                exerciseId,
                base64Image: base64,
                contentType: file.type,
              },
            });
          } catch (err) {
            console.error('Error uploading image:', err);
          }
        }
      }

      toast.success('Ćwiczenie zostało utworzone!');

      if (addAnother) {
        resetForm();
        nameInputRef.current?.focus();
      } else {
        onOpenChange(false);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Nie udało się utworzyć ćwiczenia');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-3xl w-[90vw] h-[90vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg flex items-center gap-2">
                  Nowe ćwiczenie
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Brain className="h-3 w-3" />
                    AI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Wpisz nazwę lub użyj mikrofonu – AI uzupełni resztę
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-5">
            {/* Main Input with Voice */}
            <div className="space-y-3">
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  value={voiceState === 'listening' ? interimTranscript || data.name : data.name}
                  onChange={(e) => {
                    updateField('name', e.target.value);
                    setShowAISuggestions(true);
                  }}
                  placeholder="Wpisz nazwę ćwiczenia lub podyktuj..."
                  className={cn(
                    "h-14 text-lg pl-4 pr-14 transition-all duration-300",
                    voiceState === 'listening' && "ring-2 ring-primary animate-pulse",
                    aiLoadingType && "ring-2 ring-primary/50 bg-primary/5"
                  )}
                  disabled={voiceState === 'listening' || !!aiLoadingType}
                />
                {voiceSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleListening}
                    disabled={isLoadingAI}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg",
                      voiceState === 'listening' && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {voiceState === 'listening' ? (
                      <div className="relative">
                        <Mic className="h-5 w-5" />
                        <span className="absolute -inset-1 animate-ping rounded-full bg-destructive/30" />
                      </div>
                    ) : (
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
              {voiceError && (
                <p className="text-sm text-destructive">{voiceError}</p>
              )}
              {voiceState === 'listening' && (
                <p className="text-sm text-primary animate-pulse">🎤 Słucham... mów teraz</p>
              )}
              {data.name.length > 0 && data.name.length < 2 && (
                <p className="text-sm text-destructive">Nazwa musi mieć min. 2 znaki</p>
              )}
            </div>

            {/* === STEP 1: Quick Templates (gdy brak nazwy) === */}
            {!data.name && !aiLoadingType && (
              <div
                key="step-templates"
                className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <p className="text-sm text-muted-foreground">Popularne ćwiczenia:</p>
                <div className="flex flex-wrap gap-2 animate-stagger">
                  {QUICK_TEMPLATES.slice(0, 6).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateClick(template)}
                      disabled={isLoadingAI}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200",
                        "bg-surface-light border border-border/60",
                        "hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]",
                        "active:scale-[0.98]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      data-testid={`exercise-quick-template-${template.id}-btn`}
                    >
                      <span>{template.icon}</span>
                      <span>{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* === AI Loading State - Template/Voice === */}
            {(aiLoadingType === 'template' || aiLoadingType === 'voice') && (
              <div
                key="step-loading"
                className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5 animate-in fade-in zoom-in-95 duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                      <Brain className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div className="absolute -inset-1 rounded-xl bg-primary/20 animate-ping opacity-75" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {aiLoadingType === 'voice' ? 'Analizuję nagranie...' : 'Generuję ćwiczenie...'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {aiLoadingType === 'voice'
                        ? 'AI przetwarza Twoje polecenie głosowe'
                        : 'AI dobiera optymalne parametry ćwiczenia'}
                    </p>
                    {/* Progress shimmer */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-surface-light overflow-hidden">
                      <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary via-emerald-400 to-primary animate-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === AI Features (gdy jest nazwa >= 2 znaki) === */}
            {data.name.length >= 2 && !aiLoadingType && (
              <div
                key="step-ai-features"
                className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                {/* Hero AI Image Generation Button - USP */}
                {!isGeneratingImage && mediaFiles.length === 0 && (
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || mediaFiles.length >= 5}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 w-full",
                      "bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600",
                      "hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01]",
                      "active:scale-[0.99] cursor-pointer",
                      "animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    data-testid="exercise-create-ai-image-hero-btn"
                  >
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

                    <div className="relative flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Wand2 className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 flex items-center gap-2">
                          Wygeneruj obraz AI
                          <Sparkles className="h-4 w-4 text-yellow-300" />
                        </h3>
                        <p className="text-sm text-white/80">Profesjonalna ilustracja do Twojego ćwiczenia</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs text-white/60 mb-1">5 kredytów</span>
                        <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                  </button>
                )}

                {/* Compact AI Image Button - when image already generated */}
                {!isGeneratingImage && mediaFiles.length > 0 && mediaFiles.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    className="gap-2 border-violet-500/50 hover:border-violet-500 hover:bg-violet-500/5 text-violet-400 animate-in fade-in duration-300"
                    data-testid="exercise-create-ai-image-btn"
                  >
                    <Wand2 className="h-4 w-4" />
                    Wygeneruj kolejny obraz
                    <span className="text-xs text-muted-foreground">5 kr.</span>
                  </Button>
                )}

                {/* Generating image state - fancy */}
                {isGeneratingImage && (
                  <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border border-violet-500/40 p-5 animate-in fade-in zoom-in-95 duration-300 overflow-hidden relative">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/30 to-violet-500/0 animate-shimmer" />
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 backdrop-blur-sm">
                          <Wand2 className="h-7 w-7 text-violet-300" />
                        </div>
                        {/* Orbiting dots */}
                        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400" />
                        </div>
                        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '-1s' }}>
                          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '-2s' }}>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-fuchsia-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-violet-200 mb-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                          Generowanie obrazu AI
                        </h3>
                        <p className="text-sm text-violet-300/80 mb-3">
                          Tworzę profesjonalną ilustrację dla &ldquo;{data.name}&rdquo;
                        </p>
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-violet-500/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400"
                            style={{
                              width: '100%',
                              animation: 'progress-indeterminate 1.5s ease-in-out infinite',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated image preview - enhanced */}
                {mediaFiles.length > 0 && (
                  <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                          <Sparkles className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-violet-300">
                            {mediaFiles.length === 1 ? 'Obraz AI' : `Obrazy AI (${mediaFiles.length})`}
                          </span>
                          <p className="text-xs text-violet-400/60">
                            Zostanie dodany do ćwiczenia
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || mediaFiles.length >= 5}
                        className="gap-1.5 border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
                        data-testid="exercise-regenerate-image-btn"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {mediaFiles.length >= 5 ? 'Limit 5' : 'Wygeneruj kolejny'}
                      </Button>
                    </div>

                    {/* Main image - larger preview */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: mediaFiles.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                      {mediaFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative rounded-xl overflow-hidden border-2 group shadow-lg transition-all duration-300",
                            idx === 0
                              ? "border-violet-500 shadow-violet-500/20"
                              : "border-violet-500/40 hover:border-violet-500/70 shadow-violet-500/10",
                            mediaFiles.length === 1 ? "aspect-[3/4] max-w-[200px]" : "aspect-square"
                          )}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Wygenerowany obraz ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay with actions */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                              {idx === 0 && (
                                <span className="px-2 py-1 rounded-md bg-violet-500 text-[10px] font-semibold text-white">
                                  Główne zdjęcie
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="ml-auto p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors"
                                data-testid={`exercise-remove-image-${idx}-btn`}
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          </div>
                          {/* Badge for main image when not hovering */}
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-violet-500/90 text-[10px] font-semibold text-white group-hover:opacity-0 transition-opacity">
                              Główne
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Hint */}
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Najedź na zdjęcie aby usunąć • Max 5 zdjęć
                    </p>
                  </div>
                )}

                {/* AI Text Description - gdy model zwrócił tekst zamiast obrazu */}
                {aiTextDescription && (
                  <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                        <FileText className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-amber-300">
                            AI wygenerował opis
                          </h3>
                          <span className="text-xs text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded">
                            zamiast obrazu
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                          {aiTextDescription}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleUseAiDescription}
                            className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                            data-testid="exercise-use-ai-description-btn"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Użyj jako opis
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiTextDescription(null)}
                            className="gap-1.5 text-muted-foreground"
                            data-testid="exercise-dismiss-ai-description-btn"
                          >
                            <X className="h-3.5 w-3.5" />
                            Odrzuć
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="gap-1.5 ml-auto border-violet-500/50 text-violet-400"
                            data-testid="exercise-retry-image-btn"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Spróbuj ponownie
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Suggestions - z loaderem */}
                {showAISuggestions && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                    <AIExerciseSuggestions
                      suggestion={aiSuggestion}
                      isLoading={isLoadingAI}
                      onApply={applyAISuggestion}
                      onDismiss={() => setShowAISuggestions(false)}
                    />
                  </div>
                )}

                {/* Toggle advanced options */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenSections(prev => ({ ...prev, params: !prev.params }))}
                    className="gap-2 w-full justify-center sm:w-auto sm:justify-start"
                    data-testid="exercise-create-toggle-params-btn"
                  >
                    <Dumbbell className="h-4 w-4" />
                    {openSections.params ? 'Ukryj parametry' : 'Dostosuj parametry'}
                    {openSections.params ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicated image preview for outside step-ai-features (when typing name < 2) */}
            {data.name.length < 2 && mediaFiles.length > 0 && (
              <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-300">
                    {mediaFiles.length === 1 ? 'Wygenerowany obraz' : `Wygenerowane obrazy (${mediaFiles.length})`}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {mediaFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-violet-500/40 group shadow-lg shadow-violet-500/10 transition-all duration-300 hover:scale-105 hover:border-violet-500"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Wygenerowany obraz ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        data-testid={`exercise-remove-image-${idx}-btn`}
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-violet-500/80 text-[10px] font-medium text-white">
                          Główne
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === SEKCJA PARAMETRÓW - Nowoczesny UI === */}
            {data.name && openSections.params && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

                {/* Typ ćwiczenia - duże przyciski */}
                <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Typ ćwiczenia</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {EXERCISE_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = data.type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => updateField('type', type.value)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-surface-light hover:border-border hover:bg-surface-hover text-muted-foreground"
                          )}
                          data-testid={`exercise-type-${type.value}-btn`}
                        >
                          <Icon className={cn("h-6 w-6", isSelected && "text-primary")} />
                          <span className="text-sm font-medium">{type.label}</span>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Parametry treningowe - kompaktowy grid */}
                <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Repeat className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Parametry treningowe</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Serie */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">Serie</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateField('sets', Math.max(1, (data.sets || 3) - 1))}
                          aria-label="Zmniejsz serie"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={data.sets || ''}
                          onChange={(e) => updateField('sets', e.target.value ? Number(e.target.value) : null)}
                          className="h-9 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min={1}
                          max={50}
                          aria-label="Liczba serii"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateField('sets', Math.min(50, (data.sets || 3) + 1))}
                          aria-label="Zwiększ serie"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Powtórzenia lub Czas */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">
                        {data.type === 'reps' ? 'Powtórzenia' : 'Czas (s)'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            if (data.type === 'reps') {
                              updateField('reps', Math.max(1, (data.reps || 10) - 1));
                            } else {
                              updateField('duration', Math.max(1, (data.duration || 30) - 5));
                            }
                          }}
                          aria-label="Zmniejsz wartość"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={data.type === 'reps' ? (data.reps || '') : (data.duration || '')}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            if (data.type === 'reps') {
                              updateField('reps', val);
                            } else {
                              updateField('duration', val);
                            }
                          }}
                          className="h-9 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={data.type === 'reps' ? 'Liczba powtórzeń' : 'Czas trwania'}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            if (data.type === 'reps') {
                              updateField('reps', Math.min(100, (data.reps || 10) + 1));
                            } else {
                              updateField('duration', Math.min(600, (data.duration || 30) + 5));
                            }
                          }}
                          aria-label="Zwiększ wartość"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Przerwa */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Pause className="h-3 w-3" />
                        Przerwa (s)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateField('restSets', Math.max(0, (data.restSets || 60) - 5))}
                          aria-label="Zmniejsz przerwę"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={data.restSets || ''}
                          onChange={(e) => updateField('restSets', e.target.value ? Number(e.target.value) : null)}
                          className="h-9 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min={0}
                          max={300}
                          step={5}
                          aria-label="Czas przerwy w sekundach"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => updateField('restSets', Math.min(300, (data.restSets || 60) + 5))}
                          aria-label="Zwiększ przerwę"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Strona ciała */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowLeftRight className="h-3 w-3" />
                        Strona
                      </span>
                      <Select value={data.exerciseSide} onValueChange={(v) => updateField('exerciseSide', v as ExerciseSide)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
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
                </div>

                {/* Opis - textarea */}
                <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Opis techniki</span>
                    <span className="text-xs text-muted-foreground">(opcjonalnie)</span>
                  </div>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Opisz krok po kroku jak prawidłowo wykonać ćwiczenie..."
                    className="min-h-[80px] resize-none bg-background/50"
                  />
                </div>

                {/* Kategorie */}
                <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Kategorie</span>
                  </div>
                  <TagPicker
                    availableTags={tags}
                    selectedMainTags={data.mainTags}
                    selectedAdditionalTags={data.additionalTags}
                    onMainTagsChange={(tags) => updateField('mainTags', tags)}
                    onAdditionalTagsChange={(tags) => updateField('additionalTags', tags)}
                    maxMainTags={3}
                  />
                </div>

                {/* Dodatkowe media - collapsed by default */}
                <details className="rounded-xl border border-border/60 bg-surface/50 group">
                  <summary className="flex items-center gap-2 p-4 cursor-pointer list-none">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Dodatkowe media</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4">
                    <MediaUploadSection
                      files={mediaFiles}
                      onFilesChange={setMediaFiles}
                      videoUrl={data.videoUrl}
                      onVideoUrlChange={(url) => updateField('videoUrl', url)}
                      gifUrl={data.gifUrl}
                      onGifUrlChange={(url) => updateField('gifUrl', url)}
                    />
                  </div>
                </details>

                {/* Notatki - collapsed by default */}
                <details className="rounded-xl border border-border/60 bg-surface/50 group">
                  <summary className="flex items-center gap-2 p-4 cursor-pointer list-none">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Notatki wewnętrzne</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4">
                    <Textarea
                      value={data.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Dodatkowe uwagi, modyfikacje, przeciwwskazania..."
                      className="min-h-[60px] resize-none bg-background/50"
                    />
                  </div>
                </details>

              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCloseAttempt}
            disabled={isSaving}
          >
            Anuluj
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={isSaving || !isBasicsValid}
              className="gap-2"
            >
              {isSaving && saveAndAddAnother ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Zapisz i dodaj kolejne
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || !isBasicsValid}
              className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
            >
              {isSaving && !saveAndAddAnother ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Zapisz ćwiczenie
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}
