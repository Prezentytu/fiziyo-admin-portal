"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useExerciseBuilder } from "@/contexts/ExerciseBuilderContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";

// ========================================
// Form Schema
// ========================================

const createSetFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć minimum 2 znaki"),
  description: z.string().optional(),
});

type CreateSetFormValues = z.infer<typeof createSetFormSchema>;

// ========================================
// Component
// ========================================

interface CreateSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSetDialog({ open, onOpenChange }: CreateSetDialogProps) {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { selectedExercises, clearBuilder, exerciseCount } = useExerciseBuilder();
  const [isCreating, setIsCreating] = useState(false);

  const organizationId = currentOrganization?.organizationId;

  const form = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const [createExerciseSet] = useMutation(CREATE_EXERCISE_SET_MUTATION);
  const [addExerciseToSet] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const handleSubmit = async (values: CreateSetFormValues) => {
    if (!organizationId) {
      toast.error("Brak organizacji");
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error("Dodaj przynajmniej jedno ćwiczenie do zestawu");
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create the exercise set
      const { data: setData } = await createExerciseSet({
        variables: {
          organizationId,
          name: values.name,
          description: values.description || null,
        },
      });

      const exerciseSetId = setData?.createExerciseSet?.id;
      if (!exerciseSetId) {
        throw new Error("Nie udało się utworzyć zestawu");
      }

      // 2. Add all exercises to the set
      const addPromises = selectedExercises.map((exercise, index) =>
        addExerciseToSet({
          variables: {
            exerciseId: exercise.id,
            exerciseSetId,
            order: index + 1,
            sets: exercise.sets || null,
            reps: exercise.reps || null,
            duration: exercise.duration || null,
          },
        })
      );

      await Promise.all(addPromises);

      // 3. Success!
      toast.success("Zestaw został utworzony", {
        description: `${exerciseCount} ${exerciseCount === 1 ? "ćwiczenie" : exerciseCount < 5 ? "ćwiczenia" : "ćwiczeń"} w zestawie`,
      });

      // Clear the builder
      clearBuilder();

      // Reset form
      form.reset();

      // Close dialog
      onOpenChange(false);

      // Navigate to the new set
      router.push(`/exercise-sets/${exerciseSetId}`);
    } catch (error) {
      console.error("Error creating exercise set:", error);
      toast.error("Nie udało się utworzyć zestawu", {
        description: error instanceof Error ? error.message : "Spróbuj ponownie",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid="create-set-dialog">
        <DialogHeader>
          <DialogTitle>Utwórz nowy zestaw</DialogTitle>
          <DialogDescription>
            Zestaw będzie zawierał {exerciseCount}{" "}
            {exerciseCount === 1 ? "ćwiczenie" : exerciseCount < 5 ? "ćwiczenia" : "ćwiczeń"}.
            Nadaj mu nazwę i opcjonalnie dodaj opis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa zestawu *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="np. Rehabilitacja kolana"
                      disabled={isCreating}
                      data-testid="create-set-name-input"
                    />
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
                  <FormLabel>Opis (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Krótki opis zestawu..."
                      rows={3}
                      disabled={isCreating}
                      data-testid="create-set-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                data-testid="create-set-cancel-btn"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                data-testid="create-set-submit-btn"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  "Utwórz zestaw"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
