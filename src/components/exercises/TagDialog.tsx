"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@apollo/client/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ExerciseTag } from "./TagCard";
import {
  CREATE_EXERCISE_TAG_MUTATION,
  UPDATE_TAG_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from "@/graphql/queries/exerciseTags.queries";

const tagFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki").max(50, "Nazwa może mieć max. 50 znaków"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Podaj prawidłowy kolor HEX"),
  icon: z.string().optional(),
  isMain: z.boolean(),
});

type TagFormValues = {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isMain: boolean;
};

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: ExerciseTag | null;
  organizationId: string;
  onSuccess?: () => void;
}

const colorPresets = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function TagDialog({
  open,
  onOpenChange,
  tag,
  organizationId,
  onSuccess,
}: TagDialogProps) {
  const isEditing = !!tag;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name || "",
      description: tag?.description || "",
      color: tag?.color || "#22c55e",
      icon: tag?.icon || "",
      isMain: tag?.isMain || false,
    },
  });

  const isDirty = form.formState.isDirty;

  const handleCloseAttempt = useCallback(() => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  React.useEffect(() => {
    if (tag) {
      form.reset({
        name: tag.name,
        description: tag.description || "",
        color: tag.color || "#22c55e",
        icon: tag.icon || "",
        isMain: tag.isMain || false,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        color: "#22c55e",
        icon: "",
        isMain: false,
      });
    }
  }, [tag, form]);

  const [createTag, { loading: creating }] = useMutation(CREATE_EXERCISE_TAG_MUTATION, {
    refetchQueries: [
      { query: GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, variables: { organizationId } },
    ],
  });

  const [updateTag, { loading: updating }] = useMutation(UPDATE_TAG_MUTATION, {
    refetchQueries: [
      { query: GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, variables: { organizationId } },
    ],
  });

  const handleSubmit = async (values: TagFormValues) => {
    try {
      if (isEditing && tag) {
        await updateTag({
          variables: {
            tagId: tag.id,
            name: values.name,
            description: values.description || null,
            color: values.color,
            icon: values.icon || "tag",
            isMain: values.isMain,
          },
        });
        toast.success("Tag został zaktualizowany");
      } else {
        await createTag({
          variables: {
            name: values.name,
            description: values.description || null,
            color: values.color,
            icon: values.icon || "tag",
            isGlobal: false,
            organizationId,
            isMain: values.isMain,
          },
        });
        toast.success("Tag został utworzony");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania tagu:", error);
      toast.error(isEditing ? "Nie udało się zaktualizować tagu" : "Nie udało się utworzyć tagu");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edytuj tag" : "Nowy tag"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Zmień właściwości tagu" : "Dodaj nowy tag do biblioteki"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Plecy" {...field} />
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
                    <Textarea placeholder="Opcjonalny opis..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolor *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded border border-border"
                          style={{ backgroundColor: field.value }}
                        />
                        <Input
                          placeholder="#22c55e"
                          {...field}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="h-6 w-6 rounded border border-border transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                            onClick={() => form.setValue("color", color)}
                          />
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isMain"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Tag główny</FormLabel>
                    <FormDescription>
                      Główne tagi są wyświetlane jako pierwsze
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAttempt}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Zapisz zmiany" : "Dodaj tag"}
              </Button>
            </div>
          </form>
        </Form>
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

