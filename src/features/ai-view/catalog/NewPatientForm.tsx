'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NewPatientInput } from './useChatWrites';

export const NEW_PATIENT_SCHEMA = z
  .object({
    firstName: z.string().trim().min(1, 'Podaj imię'),
    lastName: z.string().trim().min(1, 'Podaj nazwisko'),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\+?[\d\s-]{9,15}$/.test(value), 'Numer telefonu wygląda na niepełny'),
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Niepoprawny e-mail'),
    contextLabel: z.string().trim().max(80),
  })
  .refine((values) => values.phone !== '' || values.email !== '', {
    message: 'Podaj telefon albo e-mail, żeby pacjent mógł się zalogować',
    path: ['phone'],
  });

export type NewPatientValues = z.infer<typeof NEW_PATIENT_SCHEMA>;

function splitName(name: string | undefined): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

interface NewPatientFormProps {
  readonly defaultName?: string;
  /** What the therapist already wrote (phone, e-mail, reason); the fields start filled with it. */
  readonly defaults?: { phone?: string; email?: string; contextLabel?: string };
  readonly submitLabel: string;
  readonly busy: boolean;
  readonly onSubmit: (values: NewPatientInput) => void;
  readonly onCancel?: () => void;
  readonly testId: string;
}

/** The fields the patient dialog needs to create an account, inline in the thread. */
export function NewPatientForm({
  defaultName,
  defaults,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  testId,
}: NewPatientFormProps) {
  const form = useForm<NewPatientValues>({
    resolver: zodResolver(NEW_PATIENT_SCHEMA),
    defaultValues: {
      ...splitName(defaultName),
      phone: defaults?.phone ?? '',
      email: defaults?.email ?? '',
      contextLabel: defaults?.contextLabel ?? '',
    },
  });
  const { errors } = form.formState;

  const fields: ReadonlyArray<{
    name: 'firstName' | 'lastName' | 'phone' | 'email' | 'contextLabel';
    label: string;
    required?: boolean;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
  }> = [
    { name: 'firstName', label: 'Imię', required: true, autoComplete: 'off' },
    { name: 'lastName', label: 'Nazwisko', required: true, autoComplete: 'off' },
    { name: 'phone', label: 'Telefon', type: 'tel' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'contextLabel', label: 'Powód', placeholder: 'np. kolano po ACL' },
  ];

  return (
    <form
      noValidate
      data-testid={`${testId}-form`}
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          void form.handleSubmit((values) => onSubmit(values))();
        }
        if (event.key === 'Escape' && onCancel) onCancel();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
            <span>
              {field.label}
              {field.required && (
                <span className="ml-0.5 text-status-danger" aria-hidden="true">
                  *
                </span>
              )}
            </span>
            <Input
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              required={field.required}
              aria-invalid={errors[field.name] ? true : undefined}
              data-testid={`${testId}-${field.name}-input`}
              {...form.register(field.name)}
            />
            {errors[field.name] && (
              <span className="text-[12px] text-status-danger">{errors[field.name]?.message}</span>
            )}
          </label>
        ))}
      </div>
      <p className="text-[12px] text-label-secondary" data-testid={`${testId}-contact-hint`}>
        Pola oznaczone * oraz telefon lub e-mail są wymagane.
      </p>
      <div className="flex items-center justify-between gap-3">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} data-testid={`${testId}-cancel-btn`}>
            Anuluj
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={busy} data-testid={`${testId}-submit-btn`}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
