'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExerciseFieldLabelWithTooltip } from './ExerciseFieldLabelWithTooltip';
import { EXERCISE_FIELD_TOOLTIPS } from './exerciseFieldTooltips';

const exerciseFormSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć min. 2 znaki').max(100, 'Nazwa może mieć max. 100 znaków'),
  description: z.string().optional(),
  type: z.enum(['reps', 'time']),
  sets: z.number().min(0).max(100).optional().nullable(),
  reps: z.number().min(0).max(1000).optional().nullable(),
  duration: z.number().min(0).max(3600).optional().nullable(),
  restSets: z.number().min(0).max(300).optional().nullable(),
  restReps: z.number().min(0).max(300).optional().nullable(),
  preparationTime: z.number().min(0).max(300).optional().nullable(),
  executionTime: z.number().min(0).max(300).optional().nullable(),
  exerciseSide: z.enum(['none', 'left', 'right', 'both', 'alternating']).optional(),
  videoUrl: z.string().url('Podaj prawidłowy URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  tempo: z.string().max(20).optional(),
  clinicalDescription: z.string().optional(),
  audioCue: z.string().max(200).optional(),
  rangeOfMotion: z.string().max(100).optional(),
  // Passthrough fields - nieedytowalne w obecnym formularzu, ale przekazywane
  // do mutacji UpdateExercise, zeby nie zgubic istniejacych wartosci.
  mainTags: z.array(z.string()).optional().nullable(),
  additionalTags: z.array(z.string()).optional().nullable(),
  difficultyLevel: z.enum(['Unknown', 'Easy', 'Medium', 'Hard', 'Expert']).optional().nullable(),
  loadType: z.string().optional().nullable(),
  loadValue: z.number().optional().nullable(),
  loadUnit: z.string().optional().nullable(),
  loadText: z.string().optional().nullable(),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

interface ExerciseFormProps {
  defaultValues?: Partial<ExerciseFormValues>;
  onSubmit: (values: ExerciseFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Optional secondary action button (e.g., "Submit to Global") */
  secondaryAction?: React.ReactNode;
  /** Optional media section rendered in edit mode */
  mediaSection?: React.ReactNode;
}

export function ExerciseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Zapisz',
  onDirtyChange,
  secondaryAction,
  mediaSection,
}: Readonly<ExerciseFormProps>) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'reps',
      sets: 3,
      reps: 10,
      duration: null,
      restSets: 60,
      restReps: 0,
      preparationTime: 5,
      executionTime: null,
      exerciseSide: 'none',
      videoUrl: '',
      notes: '',
      tempo: '',
      clinicalDescription: '',
      audioCue: '',
      rangeOfMotion: '',
      mainTags: null,
      additionalTags: null,
      difficultyLevel: null,
      loadType: null,
      loadValue: null,
      loadUnit: null,
      loadText: null,
      ...defaultValues,
    },
  });

  const isDirty = form.formState.isDirty;

  // Notify parent about dirty state
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (values: ExerciseFormValues) => {
    try {
      // Timer semantics: executionTime > 0 means timed exercise for patient.
      const inferredType: ExerciseFormValues['type'] = (values.executionTime ?? 0) > 0 ? 'time' : 'reps';
      await onSubmit({ ...values, type: inferredType });
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  return (
    <Form {...form}>
      <form data-testid="exercise-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa ćwiczenia *</FormLabel>
              <FormControl>
                <Input placeholder="np. Przysiady" data-testid="exercise-form-name-input" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <ExerciseFieldLabelWithTooltip
                label="Opis dla pacjenta"
                tooltip={EXERCISE_FIELD_TOOLTIPS.patientDescription}
                testId="exercise-form-description-info"
              />
              <FormControl>
                <Textarea
                  placeholder="Opisz ćwiczenie prostym językiem dla pacjenta..."
                  className="min-h-[100px]"
                  data-testid="exercise-form-description-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-1">
          <FormField
            control={form.control}
            name="exerciseSide"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Strona ciała"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.exerciseSide}
                  testId="exercise-form-side-info"
                />
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="exercise-form-side-select">
                      <SelectValue placeholder="Wybierz stronę" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Bez podziału</SelectItem>
                    <SelectItem value="left">Lewa strona</SelectItem>
                    <SelectItem value="right">Prawa strona</SelectItem>
                    <SelectItem value="both">Obie strony</SelectItem>
                    <SelectItem value="alternating">Naprzemiennie</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="sets"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Liczba serii"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.sets}
                  testId="exercise-form-sets-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reps"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Liczba powtórzeń"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.reps}
                  testId="exercise-form-reps-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="executionTime"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Czas powtórzenia (s)"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.executionTime}
                  testId="exercise-form-execution-time-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>Wartość {`>`} 0 uruchamia timer w aplikacji pacjenta.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="restSets"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Przerwa między seriami (s)"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.restSets}
                  testId="exercise-form-rest-sets-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>Czas odpoczynku po każdej serii</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="restReps"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Przerwa między powtórzeniami (s)"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.restReps}
                  testId="exercise-form-rest-reps-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) || 0 : 0)}
                  />
                </FormControl>
                <FormDescription>Czas między powtórzeniami (0 = brak)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="preparationTime"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Przygotowanie (s)"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.preparationTime}
                  testId="exercise-form-preparation-time-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <ExerciseFieldLabelWithTooltip
                  label="Czas serii (tryb czasowy, s)"
                  tooltip={EXERCISE_FIELD_TOOLTIPS.duration}
                  testId="exercise-form-duration-info"
                />
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="3600"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>Opcjonalne pole dla ćwiczeń liczonych czasem zamiast powtórzeń.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <ExerciseFieldLabelWithTooltip
                label="URL filmu"
                tooltip={EXERCISE_FIELD_TOOLTIPS.videoUrl}
                testId="exercise-form-video-url-info"
              />
              <FormControl>
                <Input placeholder="https://..." {...field} data-testid="exercise-form-video-url-input" />
              </FormControl>
              <FormDescription>Link do filmiku instruktażowego</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <ExerciseFieldLabelWithTooltip
                label="Notatki"
                tooltip={EXERCISE_FIELD_TOOLTIPS.notes}
                testId="exercise-form-notes-info"
              />
              <FormControl>
                <Textarea placeholder="Dodatkowe uwagi dla fizjoterapeuty..." className="min-h-[80px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mediaSection}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              data-testid="exercise-form-advanced-toggle"
            >
              Zaawansowane
              <ChevronDown className="h-4 w-4 data-[state=open]:rotate-180 transition-transform" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 sm:grid-cols-2 pt-2 space-y-4">
              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <ExerciseFieldLabelWithTooltip
                      label="Tempo (np. 3-0-1-0)"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.tempo}
                      testId="exercise-form-tempo-info"
                    />
                    <FormControl>
                      <Input placeholder="np. 2-1-2-0" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rangeOfMotion"
                render={({ field }) => (
                  <FormItem>
                    <ExerciseFieldLabelWithTooltip
                      label="Zakres ruchu (ROM)"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.rangeOfMotion}
                      testId="exercise-form-range-of-motion-info"
                    />
                    <FormControl>
                      <Input placeholder="np. 0–90°" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audioCue"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <ExerciseFieldLabelWithTooltip
                      label="Podpowiedź głosowa TTS"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.audioCue}
                      testId="exercise-form-audio-cue-info"
                    />
                    <FormControl>
                      <Input placeholder="np. Proste plecy" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clinicalDescription"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <ExerciseFieldLabelWithTooltip
                      label="Opis dla fizjoterapeuty"
                      tooltip={EXERCISE_FIELD_TOOLTIPS.clinicalDescription}
                      testId="exercise-form-clinical-description-info"
                    />
                    <FormControl>
                      <Textarea
                        placeholder="Opis kliniczny dla fizjoterapeuty (język medyczny)..."
                        className="min-h-[100px]"
                        data-testid="exercise-form-clinical-description-input"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center justify-between gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <div className="flex items-center gap-3">
            {secondaryAction}
            <Button type="submit" disabled={isLoading} data-testid="exercise-form-submit-btn">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
