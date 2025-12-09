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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const setFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki").max(100, "Nazwa może mieć max. 100 znaków"),
  description: z.string().optional(),
});

export type SetFormValues = z.infer<typeof setFormSchema>;

interface SetFormProps {
  defaultValues?: Partial<SetFormValues>;
  onSubmit: (values: SetFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function SetForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Zapisz",
}: SetFormProps) {
  const form = useForm<SetFormValues>({
    resolver: zodResolver(setFormSchema),
    defaultValues: {
      name: "",
      description: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (values: SetFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa zestawu *</FormLabel>
              <FormControl>
                <Input placeholder="np. Rehabilitacja kolana" {...field} />
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
                  placeholder="Opisz cel zestawu ćwiczeń..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
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

