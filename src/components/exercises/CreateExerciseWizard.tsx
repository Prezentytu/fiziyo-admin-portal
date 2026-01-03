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
  Mic,
  ChevronDown,
  ChevronUp,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MediaUploadSection } from './MediaUploadSection';
import { TagPicker } from './TagPicker';
import { AIExerciseSuggestions } from './AIExerciseSuggestions';
import { QuickTemplates } from './QuickTemplates';
import { cn } from '@/lib/utils';

import { CREATE_EXERCISE_MUTATION, UPLOAD_EXERCISE_IMAGE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import type { ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';

import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  exerciseAIService,
  type ExerciseSuggestion,
  type ParsedExerciseFromAI
} from '@/services/exerciseAIService';
import { QUICK_TEMPLATES } from './QuickTemplates';

// Types
type ExerciseType = 'reps' | 'time' | 'hold';
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
  { value: 'hold', label: 'Utrzymywanie', icon: Pause },
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

// Number input with +/- buttons
function NumberControl({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  icon,
  disabled,
  compact = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  compact?: boolean;
}) {
  const handleDecrease = () => {
    const current = value ?? 0;
    if (current - step >= min) {
      onChange(current - step);
    }
  };

  const handleIncrease = () => {
    const current = value ?? 0;
    if (current + step <= max) {
      onChange(current + step);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleDecrease}
            disabled={disabled || (value ?? 0) <= min}
          >
            <span className="text-sm">−</span>
          </Button>
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            min={min}
            max={max}
            className="h-7 w-16 text-center text-sm px-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleIncrease}
            disabled={disabled || (value ?? 0) >= max}
          >
            <span className="text-sm">+</span>
          </Button>
          {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleDecrease}
          disabled={disabled || (value ?? 0) <= min}
        >
          <span className="text-lg">−</span>
        </Button>
        <div className="flex-1 relative">
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            min={min}
            max={max}
            className="text-center pr-10"
            disabled={disabled}
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleIncrease}
          disabled={disabled || (value ?? 0) >= max}
        >
          <span className="text-lg">+</span>
        </Button>
      </div>
    </div>
  );
}

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
  const [aiSuggestion, setAiSuggestion] = useState<ExerciseSuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    params: true,
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

  // Voice input hook
  const handleVoiceResult = useCallback(async (text: string) => {
    setIsLoadingAI(true);
    try {
      const parsed = await exerciseAIService.parseVoiceInput(text);
      if (parsed) {
        applyParsedExercise(parsed);
        toast.success('Ćwiczenie rozpoznane przez AI');
      } else {
        // If parsing fails, just set the name
        updateField('name', text);
        toast.info('Nie udało się sparsować szczegółów - uzupełnij ręcznie');
      }
    } catch {
      updateField('name', text);
      toast.error('Błąd AI - wprowadzono tylko nazwę');
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

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

  // Mutations
  const [createExercise] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
    ],
  });

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
    setOpenSections({ params: true, media: false, tags: false, notes: false });
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

  // Apply parsed exercise from AI
  const applyParsedExercise = useCallback((parsed: ParsedExerciseFromAI) => {
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

    // Auto-select matching tags
    if (parsed.suggestedTags.length > 0) {
      const matchingTags = tags.filter(t =>
        parsed.suggestedTags.some(st =>
          t.name.toLowerCase().includes(st.toLowerCase()) ||
          st.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      if (matchingTags.length > 0) {
        updateField('mainTags', matchingTags.slice(0, 3).map(t => t.id));
        setOpenSections(prev => ({ ...prev, tags: true }));
      }
    }
  }, [tags, updateField]);

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

    // Auto-select matching tags
    if (aiSuggestion.suggestedTags.length > 0) {
      const matchingTags = tags.filter(t =>
        aiSuggestion.suggestedTags.some(st =>
          t.name.toLowerCase().includes(st.toLowerCase()) ||
          st.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      if (matchingTags.length > 0) {
        updateField('mainTags', matchingTags.slice(0, 3).map(t => t.id));
        setOpenSections(prev => ({ ...prev, tags: true }));
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
          const suggestion = await exerciseAIService.getSuggestions(data.name, tagNames);
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

  // Handle template selection
  const handleTemplateClick = useCallback(async (template: typeof QUICK_TEMPLATES[0]) => {
    setIsLoadingAI(true);

    try {
      const generated = await exerciseAIService.generateFromTemplate(template.category);
      if (generated) {
        applyParsedExercise(generated);
        toast.success(`Wygenerowano ćwiczenie: ${generated.name}`);
      } else {
        toast.error('Nie udało się wygenerować ćwiczenia');
      }
    } catch {
      toast.error('Błąd generowania ćwiczenia');
    } finally {
      setIsLoadingAI(false);
    }
  }, [applyParsedExercise]);

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

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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
                    "h-14 text-lg pl-4 pr-14",
                    voiceState === 'listening' && "ring-2 ring-primary animate-pulse"
                  )}
                  disabled={voiceState === 'listening'}
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

            {/* AI Suggestions */}
            {showAISuggestions && data.name.length >= 3 && (
              <AIExerciseSuggestions
                exerciseName={data.name}
                suggestion={aiSuggestion}
                isLoading={isLoadingAI}
                onApply={applyAISuggestion}
                onDismiss={() => setShowAISuggestions(false)}
              />
            )}

            {/* Quick Templates */}
            {!data.name && (
              <QuickTemplates
                onSelect={handleTemplateClick}
                maxVisible={6}
              />
            )}

            {/* Description */}
            {data.name && (
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Opis techniki wykonania
                </Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Opisz krok po kroku jak prawidłowo wykonać ćwiczenie..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            )}

            {/* Parameters Section (always visible) */}
            {data.name && (
              <Collapsible open={openSections.params} onOpenChange={() => toggleSection('params')}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Parametry
                  </div>
                  {openSections.params ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Type */}
                  <div className="space-y-2">
                    <Label className="text-sm">Typ ćwiczenia</Label>
                    <div className="flex gap-1">
                      {EXERCISE_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => updateField('type', type.value)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all",
                              data.type === type.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-light hover:bg-surface-hover text-muted-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Side */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Strona ciała
                    </Label>
                    <Select value={data.exerciseSide} onValueChange={(v) => updateField('exerciseSide', v as ExerciseSide)}>
                      <SelectTrigger className="h-10 w-full sm:w-48">
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

                  {/* Main Numbers */}
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <NumberControl
                      label="Serie"
                      value={data.sets}
                      onChange={(v) => updateField('sets', v)}
                      min={1}
                      max={50}
                      icon={<Repeat className="h-3.5 w-3.5" />}
                      compact
                    />

                    {data.type === 'reps' ? (
                      <NumberControl
                        label="Powtórzenia"
                        value={data.reps}
                        onChange={(v) => updateField('reps', v)}
                        min={1}
                        max={100}
                        icon={<Dumbbell className="h-3.5 w-3.5" />}
                        compact
                      />
                    ) : (
                      <NumberControl
                        label={data.type === 'hold' ? 'Utrzymanie' : 'Czas'}
                        value={data.duration}
                        onChange={(v) => updateField('duration', v)}
                        min={1}
                        max={600}
                        unit="s"
                        icon={<Clock className="h-3.5 w-3.5" />}
                        compact
                      />
                    )}

                    <NumberControl
                      label="Przerwa między seriami"
                      value={data.restSets}
                      onChange={(v) => updateField('restSets', v)}
                      min={0}
                      max={300}
                      step={5}
                      unit="s"
                      icon={<Pause className="h-3.5 w-3.5" />}
                      compact
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tags Section */}
            {data.name && (
              <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Kategorie
                    {(data.mainTags.length > 0 || data.additionalTags.length > 0) && (
                      <Badge variant="secondary" className="text-xs">
                        {data.mainTags.length + data.additionalTags.length}
                      </Badge>
                    )}
                  </div>
                  {openSections.tags ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <TagPicker
                    availableTags={tags}
                    selectedMainTags={data.mainTags}
                    selectedAdditionalTags={data.additionalTags}
                    onMainTagsChange={(tags) => updateField('mainTags', tags)}
                    onAdditionalTagsChange={(tags) => updateField('additionalTags', tags)}
                    maxMainTags={3}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Media Section */}
            {data.name && (
              <Collapsible open={openSections.media} onOpenChange={() => toggleSection('media')}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Media
                    {(mediaFiles.length > 0 || data.videoUrl) && (
                      <Badge variant="secondary" className="text-xs">
                        {mediaFiles.length + (data.videoUrl ? 1 : 0)}
                      </Badge>
                    )}
                  </div>
                  {openSections.media ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <MediaUploadSection
                    files={mediaFiles}
                    onFilesChange={setMediaFiles}
                    videoUrl={data.videoUrl}
                    onVideoUrlChange={(url) => updateField('videoUrl', url)}
                    gifUrl={data.gifUrl}
                    onGifUrlChange={(url) => updateField('gifUrl', url)}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Notes Section */}
            {data.name && (
              <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notatki dla fizjoterapeuty
                    {data.notes && (
                      <Badge variant="secondary" className="text-xs">1</Badge>
                    )}
                  </div>
                  {openSections.notes ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Textarea
                    value={data.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Dodatkowe uwagi, modyfikacje, przeciwwskazania..."
                    className="min-h-[80px] resize-none"
                  />
                </CollapsibleContent>
              </Collapsible>
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
