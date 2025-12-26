'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Schema z walidacją: wymagany phone LUB email
const patientFormSchema = z.object({
  firstName: z.string().min(2, 'Imię musi mieć min. 2 znaki'),
  lastName: z.string().min(2, 'Nazwisko musi mieć min. 2 znaki'),
  phone: z.string().optional().refine(
    (val) => !val || val.length === 0 || val.length === 9,
    'Numer telefonu musi mieć 9 cyfr'
  ),
  email: z.string().email('Podaj prawidłowy email').optional().or(z.literal('')),
  contextLabel: z.string().optional(),
}).refine(
  (data) => (data.phone && data.phone.length === 9) || (data.email && data.email.length > 0),
  {
    message: 'Podaj numer telefonu lub email',
    path: ['phone'], // Pokazuje błąd przy polu phone
  }
);

export type PatientFormValues = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  contextLabel?: string;
};

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Zapisz',
  onDirtyChange,
}: PatientFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      contextLabel: '',
      ...defaultValues,
    },
  });

  const isDirty = form.formState.isDirty;

  // Notify parent about dirty state
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (values: PatientFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Name fields - side by side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imię *</FormLabel>
                <FormControl>
                  <Input placeholder="Jan" autoFocus {...field} />
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

        {/* Contact fields - side by side */}
        <p className="text-sm text-muted-foreground mb-1">Podaj numer telefonu lub email (wymagane jedno z nich)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <PhoneInput placeholder="123 456 789" value={field.value ?? ''} onChange={field.onChange} />
                </FormControl>
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
                  <Input type="email" placeholder="jan@przykład.pl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Context label - optional with quick tags */}
        <FormField
          control={form.control}
          name="contextLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notatka</FormLabel>
              <FormControl>
                <Input placeholder="np. Ból pleców, Rehabilitacja kolana..." {...field} />
              </FormControl>
              {/* Quick tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Kolano', 'Kręgosłup', 'Bark', 'Biodro', 'Rehabilitacja', 'Ból pleców'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const currentValue = field.value || '';
                      const newValue = currentValue ? `${currentValue}, ${tag}` : tag;
                      field.onChange(newValue);
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-surface-light text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
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
