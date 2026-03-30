import { z } from 'zod';
import { validateIban, validateNIP } from '@/lib/validators/billing';

export const billingDetailsSchema = z.object({
  companyName: z.string().trim().min(2, 'Nazwa firmy musi mieć minimum 2 znaki').max(200, 'Nazwa firmy jest za długa'),
  nip: z.string().trim().refine((value) => validateNIP(value).valid, {
    message: 'Nieprawidłowy numer NIP',
  }),
  address: z.string().trim().min(5, 'Adres musi mieć minimum 5 znaków').max(300, 'Adres jest za długi'),
  postalCode: z.string().trim().regex(/^\d{2}-\d{3}$/, 'Kod pocztowy musi mieć format XX-XXX'),
  city: z.string().trim().min(2, 'Miasto musi mieć minimum 2 znaki').max(120, 'Nazwa miasta jest za długa'),
  iban: z.string().trim().refine((value) => validateIban(value).valid, {
    message: 'Nieprawidłowy numer IBAN',
  }),
  billingEmail: z.string().trim().email('Nieprawidłowy adres email'),
});

export type BillingDetailsFormValues = z.infer<typeof billingDetailsSchema>;

export interface BillingDetails {
  companyName: string;
  nip: string;
  address: string;
  postalCode: string;
  city: string;
  iban: string;
  billingEmail: string;
  isComplete: boolean;
}

export interface BillingDetailsStatus {
  isComplete: boolean;
  billingDetails: BillingDetails | null;
}

export interface UpdateBillingDetailsResult {
  success: boolean;
  message?: string;
  billingDetails: BillingDetails | null;
}
