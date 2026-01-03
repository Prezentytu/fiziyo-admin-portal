"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const exerciseFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki").max(100, "Nazwa może mieć max. 100 znaków"),
  description: z.string().optional(),
  type: z.enum(["reps", "time", "hold"]),
  sets: z.number().min(0).max(100).optional().nullable(),
  reps: z.number().min(0).max(1000).optional().nullable(),
  duration: z.number().min(0).max(3600).optional().nullable(),
  restSets: z.number().min(0).max(300).optional().nullable(),
  restReps: z.number().min(0).max(300).optional().nullable(),
  preparationTime: z.number().min(0).max(300).optional().nullable(),
  executionTime: z.number().min(0).max(300).optional().nullable(),
  exerciseSide: z.enum(["none", "left", "right", "both"]).optional(),
  videoUrl: z.string().url("Podaj prawidłowy URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

interface ExerciseFormProps {
  defaultValues?: Partial<ExerciseFormValues>;
  onSubmit: (values: ExerciseFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ExerciseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Zapisz",
  onDirtyChange,
}: ExerciseFormProps) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "reps",
      sets: 3,
      reps: 10,
      duration: null,
      restSets: 60,
      restReps: 30,
      preparationTime: 5,
      executionTime: null,
      exerciseSide: "none",
      videoUrl: "",
      notes: "",
      ...defaultValues,
    },
  });

  const watchType = form.watch("type");
  const isDirty = form.formState.isDirty;

  // Notify parent about dirty state
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (values: ExerciseFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa ćwiczenia *</FormLabel>
              <FormControl>
                <Input placeholder="np. Przysiady" {...field} />
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
              <FormLabel>Opis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Opisz technikę wykonania ćwiczenia..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typ ćwiczenia *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz typ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="reps">Powtórzenia</SelectItem>
                    <SelectItem value="time">Czasowe</SelectItem>
                    <SelectItem value="hold">Utrzymywanie</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exerciseSide"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strona ciała</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz stronę" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Bez podziału</SelectItem>
                    <SelectItem value="left">Lewa strona</SelectItem>
                    <SelectItem value="right">Prawa strona</SelectItem>
                    <SelectItem value="both">Obie strony</SelectItem>
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
                <FormLabel>Liczba serii</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchType === "reps" && (
            <FormField
              control={form.control}
              name="reps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liczba powtórzeń</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(watchType === "time" || watchType === "hold") && (
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Czas serii (sekundy)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="3600"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="restSets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Przerwa między seriami (s)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ""}
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
                <FormLabel>Przerwa między powtórzeniami (s)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>Czas między powtórzeniami</FormDescription>
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
                <FormLabel>Przygotowanie (s)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ""}
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
                <FormLabel>Czas powtórzenia (s)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
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
              <FormLabel>URL wideo (Vimeo)</FormLabel>
              <FormControl>
                <Input placeholder="https://vimeo.com/..." {...field} />
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
              <FormLabel>Notatki</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dodatkowe uwagi dla fizjoterapeuty..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
