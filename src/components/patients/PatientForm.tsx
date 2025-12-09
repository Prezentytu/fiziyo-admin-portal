"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const patientFormSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki"),
  phone: z.string().min(9, "Podaj prawidłowy numer telefonu"),
  email: z.string().email("Podaj prawidłowy email").optional().or(z.literal("")),
  contextLabel: z.string().optional(),
  sendActivationSms: z.boolean(),
});

export type PatientFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  contextLabel?: string;
  sendActivationSms: boolean;
};

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Zapisz",
}: PatientFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      contextLabel: "",
      sendActivationSms: false,
      ...defaultValues,
    },
  });

  const handleSubmit = async (values: PatientFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imię *</FormLabel>
                <FormControl>
                  <Input placeholder="Jan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwisko *</FormLabel>
                <FormControl>
                  <Input placeholder="Kowalski" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numer telefonu *</FormLabel>
              <FormControl>
                <Input placeholder="+48 123 456 789" {...field} />
              </FormControl>
              <FormDescription>
                Na ten numer zostanie wysłany link do aktywacji konta
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="jan.kowalski@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contextLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etykieta / powód wizyty</FormLabel>
              <FormControl>
                <Input placeholder="np. Rehabilitacja kolana" {...field} />
              </FormControl>
              <FormDescription>
                Krótki opis kontekstu leczenia
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sendActivationSms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Wyślij SMS z linkiem aktywacyjnym</FormLabel>
                <FormDescription>
                  Pacjent otrzyma SMS z linkiem do aktywacji konta w aplikacji
                </FormDescription>
              </div>
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

