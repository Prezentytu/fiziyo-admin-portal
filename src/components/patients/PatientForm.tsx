'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, X, User, Phone, Mail, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { getAvatarGradient, getInitials } from '@/utils/textUtils';

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
  onValuesChange?: (values: PatientFormValues) => void;
}

// Pogrupowane quick tags
const QUICK_TAG_GROUPS = [
  {
    label: 'Obszar',
    tags: ['Kolano', 'Kręgosłup', 'Bark', 'Biodro', 'Stopa', 'Nadgarstek', 'Szyja'],
  },
  {
    label: 'Typ',
    tags: ['Rehabilitacja', 'Profilaktyka', 'Ból', 'Pourazowe', 'Pooperacyjne'],
  },
] as const;

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Zapisz',
  onDirtyChange,
  onValuesChange,
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
    mode: 'onChange',
  });

  const isDirty = form.formState.isDirty;

  // Watch for value changes to update live preview
  const watchedValues = useWatch({ control: form.control });

  // Notify parent about dirty state
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Notify parent about value changes for live preview
  React.useEffect(() => {
    onValuesChange?.(watchedValues as PatientFormValues);
  }, [watchedValues, onValuesChange]);

  // Track added tags for visual feedback
  const [addedTags, setAddedTags] = React.useState<Set<string>>(new Set());

  const handleAddTag = (tag: string, currentValue: string, onChange: (value: string) => void) => {
    // Check if tag already exists in the value
    const normalizedValue = currentValue.toLowerCase();
    const normalizedTag = tag.toLowerCase();

    if (normalizedValue.includes(normalizedTag)) {
      return; // Already added
    }

    const newValue = currentValue.trim() ? `${currentValue.trim()}, ${tag}` : tag;
    onChange(newValue);

    // Add to visual tracking
    setAddedTags(prev => new Set([...prev, tag]));
  };

  const handleRemoveTag = (tag: string, currentValue: string, onChange: (value: string) => void) => {
    // Remove tag from value (case insensitive)
    const parts = currentValue.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== tag.toLowerCase());
    onChange(parts.join(', '));

    // Remove from visual tracking
    setAddedTags(prev => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  };

  const isTagAdded = (tag: string, currentValue: string): boolean => {
    const normalizedValue = currentValue.toLowerCase();
    const normalizedTag = tag.toLowerCase();
    return normalizedValue.includes(normalizedTag);
  };

  const handleSubmit = async (values: PatientFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  // Compute initials and gradient for live avatar
  const firstName = watchedValues.firstName || '';
  const lastName = watchedValues.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = getInitials(firstName, lastName);
  const gradient = getAvatarGradient(firstName, lastName);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="patient-form">
        {/* Live Avatar Preview - Desktop: Side by side with form, Mobile: Above */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar - Fixed width */}
            <div className="flex justify-center sm:justify-start shrink-0 sm:w-24 sm:pt-2">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full text-white font-bold text-2xl sm:text-3xl",
                  "w-20 h-20 sm:w-24 sm:h-24",
                  "shadow-lg transition-all duration-300 ease-out",
                  "ring-4 ring-border/20",
                  initials !== '?' && "scale-100 opacity-100",
                  initials === '?' && "scale-95 opacity-60"
                )}
                style={{ background: gradient }}
              >
                <span
                  key={initials}
                  className="animate-in fade-in zoom-in-95 duration-200"
                >
                  {initials}
                </span>
              </div>
            </div>

            {/* Name Fields - Takes remaining space */}
            <div className="flex-1 min-w-0 grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Imię <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jan"
                      autoFocus
                      autoComplete="given-name"
                      className="h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="patient-form-firstname-input"
                      {...field}
                    />
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
                  <FormLabel className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nazwisko <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kowalski"
                      autoComplete="family-name"
                      className="h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="patient-form-lastname-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
          </div>

          {/* Full name - Full width, truncate if too long */}
          {fullName && (
            <p className="text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-1 duration-200 truncate">
              {fullName}
            </p>
          )}
        </div>

        {/* Contact Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Kontakt
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Podaj numer telefonu lub email (wymagane jedno z nich)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Telefon
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      placeholder="123 456 789"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      className="h-11 text-base"
                      data-testid="patient-form-phone-input"
                    />
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
                  <FormLabel className="flex items-center gap-1.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan@przykład.pl"
                      autoComplete="email"
                      className="h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      data-testid="patient-form-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Note Section with Grouped Quick Tags */}
        <FormField
          control={form.control}
          name="contextLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-sm">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Notatka
                <span className="text-xs text-muted-foreground font-normal">(opcjonalne)</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="np. Ból pleców, Rehabilitacja kolana..."
                  className="h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="patient-form-context-input"
                  {...field}
                />
              </FormControl>

              {/* Grouped Quick Tags */}
              <div className="space-y-3 pt-2">
                {QUICK_TAG_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs text-muted-foreground mb-1.5">{group.label}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.map((tag) => {
                        const isAdded = isTagAdded(tag, field.value || '');
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                handleRemoveTag(tag, field.value || '', field.onChange);
                              } else {
                                handleAddTag(tag, field.value || '', field.onChange);
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-all duration-200",
                              isAdded
                                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                : "bg-surface-light text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                          >
                            {tag}
                            {isAdded && (
                              <X className="h-3 w-3 ml-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} data-testid="patient-form-cancel-btn">
              Anuluj
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[140px] bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            data-testid="patient-form-submit-btn"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
