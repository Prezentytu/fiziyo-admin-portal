'use client';

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Search,
  Mail,
  Phone,
  Loader2,
  UserPlus,
  ChevronRight,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PatientForm, PatientFormValues } from './PatientForm';
import { cn } from '@/lib/utils';
import { getAvatarGradient, getInitials } from '@/utils/textUtils';

import { FIND_USER_BY_EMAIL_QUERY, FIND_USER_BY_PHONE_QUERY } from '@/graphql/queries/users.queries';
import { ASSIGN_PATIENT_TO_THERAPIST_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_THERAPIST_PATIENTS_QUERY, GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_CURRENT_ORGANIZATION_PLAN } from '@/graphql/queries/organizations.queries';
import type { FindUserByEmailData, FindUserByPhoneData } from '@/graphql/types/user.types';

// Typy
type LookupMode = 'email' | 'phone' | 'manual';
type LookupState = 'idle' | 'searching' | 'found' | 'form';

interface FoundUser {
  id: string;
  fullname: string;
  email?: string;
  image?: string;
  isShadowUser?: boolean;
  isActive?: boolean;
  organizationIds?: string[];
  personalData?: {
    firstName?: string;
    lastName?: string;
  };
  contactData?: {
    phone?: string;
  };
}

interface SmartPatientLookupProps {
  readonly organizationId: string;
  readonly therapistId: string;
  readonly clinicId?: string;
  readonly onSuccess: (patient: { id: string; fullname: string; email?: string; firstName?: string; lastName?: string }) => void;
  readonly onCreateNewPatient: (values: PatientFormValues) => Promise<void>;
  readonly onCancel: () => void;
  readonly onDirtyChange?: (isDirty: boolean) => void;
  readonly isLoading?: boolean;
}

// Walidacja email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Walidacja telefonu (9 cyfr)
const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replaceAll(' ', '');
  return cleanPhone.length === 9 && /^\d+$/.test(cleanPhone);
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function SmartPatientLookup({
  organizationId,
  therapistId,
  clinicId,
  onSuccess,
  onCreateNewPatient,
  onCancel,
  onDirtyChange,
  isLoading: externalLoading = false,
}: SmartPatientLookupProps) {
  // Stan
  const [mode, setMode] = useState<LookupMode>('email');
  const [state, setState] = useState<LookupState>('idle');
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [contextLabel, setContextLabel] = useState('');
  const [wasAutoExpanded, setWasAutoExpanded] = useState(false); // Track if form auto-expanded after not found

  // Ref dla autofocus
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Debounced values (200ms for faster response)
  const debouncedEmail = useDebounce(emailValue, 200);
  const debouncedPhone = useDebounce(phoneValue, 200);

  // Track dirty state
  const isDirty = emailValue.length > 0 || phoneValue.length > 0 || state === 'form';

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Query: szukaj po email w całej bazie
  const {
    data: emailData,
    loading: emailLoading,
    error: emailError
  } = useQuery<FindUserByEmailData>(FIND_USER_BY_EMAIL_QUERY, {
    variables: { email: debouncedEmail },
    skip: mode !== 'email' || !isValidEmail(debouncedEmail),
    fetchPolicy: 'network-only',
  });

  // Query: szukaj po telefonie w całej bazie
  const {
    data: phoneData,
    loading: phoneLoading,
    error: phoneError
  } = useQuery<FindUserByPhoneData>(FIND_USER_BY_PHONE_QUERY, {
    variables: { phone: `+48${debouncedPhone}` },
    skip: mode !== 'phone' || !isValidPhone(debouncedPhone),
    fetchPolicy: 'network-only',
  });

  // Obsługa wyniku email query
  useEffect(() => {
    if (mode !== 'email' || !isValidEmail(debouncedEmail)) return;
    if (emailLoading) return;

    if (emailError) {
      setState('form');
      setWasAutoExpanded(true);
      return;
    }

    const user = emailData?.userByEmail;
    if (user?.id) {
      setFoundUser({
        id: user.id,
        fullname: user.fullname || '',
        email: user.email,
        image: user.image,
        isShadowUser: user.isShadowUser,
        isActive: user.isActive,
        organizationIds: user.organizationIds,
        personalData: user.personalData,
        contactData: user.contactData,
      });
      setState('found');
      setWasAutoExpanded(false);
    } else if (emailData) {
      setFoundUser(null);
      setState('form');
      setWasAutoExpanded(true);
    }
  }, [emailData, emailLoading, emailError, debouncedEmail, mode]);

  // Obsługa wyniku phone query
  useEffect(() => {
    if (mode !== 'phone' || !isValidPhone(debouncedPhone)) return;
    if (phoneLoading) return;

    if (phoneError) {
      setState('form');
      setWasAutoExpanded(true);
      return;
    }

    const user = phoneData?.userByPhone;
    if (user?.id) {
      setFoundUser({
        id: user.id,
        fullname: user.fullname || '',
        email: user.email,
        image: user.image,
        isShadowUser: user.isShadowUser,
        isActive: user.isActive,
        organizationIds: user.organizationIds,
        personalData: user.personalData,
        contactData: user.contactData,
      });
      setState('found');
      setWasAutoExpanded(false);
    } else if (phoneData) {
      setFoundUser(null);
      setState('form');
      setWasAutoExpanded(true);
    }
  }, [phoneData, phoneLoading, phoneError, debouncedPhone, mode]);

  // Loading state
  const isSearching = emailLoading || phoneLoading;

  // Mutacja: przypisz istniejącego pacjenta do terapeuty
  const [assignPatient, { loading: assignLoading }] = useMutation(ASSIGN_PATIENT_TO_THERAPIST_MUTATION, {
    refetchQueries: [
      { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_CURRENT_ORGANIZATION_PLAN, variables: { organizationId } },
    ],
  });

  // Efekt: reset state gdy zmienia się wartość
  useEffect(() => {
    if (mode === 'email') {
      if (!emailValue || !isValidEmail(emailValue)) {
        setState('idle');
        setFoundUser(null);
      } else if (isValidEmail(emailValue)) {
        setState('searching');
      }
    }
  }, [emailValue, mode]);

  useEffect(() => {
    if (mode === 'phone') {
      if (!phoneValue || !isValidPhone(phoneValue)) {
        setState('idle');
        setFoundUser(null);
      } else if (isValidPhone(phoneValue)) {
        setState('searching');
      }
    }
  }, [phoneValue, mode]);

  // Timeout: jeśli szukanie trwa zbyt długo, przejdź do formularza
  useEffect(() => {
    if (state === 'searching') {
      const timeout = setTimeout(() => {
        setState('form');
        setWasAutoExpanded(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  // Przełączanie trybu
  const switchToPhone = useCallback(() => {
    setMode('phone');
    setState('idle');
    setFoundUser(null);
    setPhoneValue('');
    setTimeout(() => phoneInputRef.current?.focus(), 100);
  }, []);

  const switchToEmail = useCallback(() => {
    setMode('email');
    setState('idle');
    setFoundUser(null);
    setEmailValue('');
    setTimeout(() => emailInputRef.current?.focus(), 100);
  }, []);

  const switchToManual = useCallback(() => {
    setMode('manual');
    setState('form');
    setFoundUser(null);
    setWasAutoExpanded(false); // Manual choice, not auto-expanded
  }, []);

  // Dodaj istniejącego pacjenta
  const handleAddExistingPatient = useCallback(async () => {
    if (!foundUser) return;

    try {
      await assignPatient({
        variables: {
          patientId: foundUser.id,
          therapistId,
          organizationId,
          clinicId: clinicId || null,
          contextType: 'PRIMARY',
          contextLabel: contextLabel || null,
        },
      });

      toast.success('Pacjent został dodany do Twoich pacjentów');
      onSuccess({
        id: foundUser.id,
        fullname: foundUser.fullname,
        email: foundUser.email,
        firstName: foundUser.personalData?.firstName,
        lastName: foundUser.personalData?.lastName,
      });
    } catch (error) {
      console.error('Błąd przy dodawaniu pacjenta:', error);
      toast.error('Nie udało się dodać pacjenta');
    }
  }, [foundUser, assignPatient, therapistId, organizationId, clinicId, contextLabel, onSuccess]);

  // Loading state
  const isLoading = externalLoading || assignLoading;

  // Initials i gradient dla znalezionego użytkownika
  const foundInitials = foundUser
    ? getInitials(foundUser.personalData?.firstName, foundUser.personalData?.lastName)
    : '?';
  const foundGradient = foundUser
    ? getAvatarGradient(foundUser.personalData?.firstName, foundUser.personalData?.lastName)
    : 'linear-gradient(135deg, #6b7280, #4b5563)';

  // Czy użytkownik jest już w organizacji
  const isAlreadyInOrg = foundUser?.organizationIds?.includes(organizationId);

  return (
    <div className="space-y-6">
      {/* Email/Phone Input Mode */}
      {state !== 'form' && mode !== 'manual' && (
        <div className={cn(
          "space-y-4",
          "animate-in fade-in duration-300"
        )}>
          {/* Input Section */}
          <div className="space-y-2">
            {mode === 'email' ? (
              <>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email pacjenta
                </label>
                <div className="relative">
                  <Input
                    ref={emailInputRef}
                    type="email"
                    placeholder="jan@example.com"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className={cn(
                      "h-12 text-base pr-10",
                      "transition-all duration-200",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      state === 'found' && "border-primary bg-primary/5"
                    )}
                    autoFocus
                    autoComplete="off"
                    data-testid="patient-lookup-email-input"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {(state === 'searching' || isSearching) && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {state === 'found' && (
                      <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in duration-200" />
                    )}
                    {state === 'idle' && (
                      <Search className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
                {/* Status message */}
                {(state === 'searching' || isSearching) && (
                  <p className="text-sm text-primary animate-pulse flex items-center gap-2 mt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Szukam pacjenta...
                  </p>
                )}
              </>
            ) : (
              <>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telefon pacjenta
                </label>
                <div className="relative">
                  <PhoneInput
                    ref={phoneInputRef}
                    placeholder="123 456 789"
                    value={phoneValue}
                    onChange={setPhoneValue}
                    className={cn(
                      "h-12 text-base",
                      state === 'found' && "border-primary bg-primary/5"
                    )}
                    data-testid="patient-lookup-phone-input"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {(state === 'searching' || isSearching) && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {state === 'found' && (
                      <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in duration-200" />
                    )}
                  </div>
                </div>
                {/* Status message */}
                {(state === 'searching' || isSearching) && (
                  <p className="text-sm text-primary animate-pulse flex items-center gap-2 mt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Szukam pacjenta...
                  </p>
                )}
              </>
            )}
          </div>

          {/* Mode Switch Links */}
          <div className="flex items-center justify-between text-sm">
            {mode === 'email' ? (
              <button
                type="button"
                onClick={switchToPhone}
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                data-testid="patient-lookup-switch-to-phone-btn"
              >
                <Phone className="h-3.5 w-3.5" />
                Nie mam emaila
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={switchToEmail}
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                data-testid="patient-lookup-switch-to-email-btn"
              >
                <Mail className="h-3.5 w-3.5" />
                Wróć do emaila
              </button>
            )}
            <button
              type="button"
              onClick={switchToManual}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs"
              data-testid="patient-lookup-switch-to-manual-btn"
            >
              Wprowadź dane ręcznie
            </button>
          </div>
        </div>
      )}

      {/* Found User Card */}
      {state === 'found' && foundUser && (
        <div className={cn(
          "p-4 rounded-xl border border-primary/30 bg-primary/5",
          "animate-in fade-in slide-in-from-bottom-2 duration-300"
        )} data-testid="patient-lookup-found-card">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isAlreadyInOrg ? 'Pacjent już w organizacji' : 'Znaleziono pacjenta'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-primary/20">
              <AvatarImage src={foundUser.image} />
              <AvatarFallback
                className="text-lg font-medium text-white"
                style={{ background: foundGradient }}
              >
                {foundInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {foundUser.fullname}
              </p>
              {foundUser.email && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {foundUser.email}
                </p>
              )}
              {foundUser.contactData?.phone && (
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {foundUser.contactData.phone}
                </p>
              )}
              {foundUser.isShadowUser && (
                <span className="inline-flex items-center text-xs text-muted-foreground mt-1">
                  (konto oczekujące na aktywację)
                </span>
              )}
            </div>
          </div>

          {/* Context Label Input */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <label htmlFor="patient-lookup-context" className="text-xs text-muted-foreground mb-1.5 block">
              Notatka (opcjonalne)
            </label>
            <Input
              id="patient-lookup-context"
              placeholder="np. Rehabilitacja kolana, Ból pleców..."
              value={contextLabel}
              onChange={(e) => setContextLabel(e.target.value)}
              className="h-9 text-sm"
              data-testid="patient-lookup-context-input"
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleAddExistingPatient}
              disabled={isLoading}
              className="flex-1 h-11 bg-linear-to-r from-primary to-primary-dark shadow-lg shadow-primary/20"
              data-testid="patient-lookup-add-existing-btn"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Dodaj do moich pacjentów
            </Button>
          </div>
        </div>
      )}

      {/* Form Mode - use PatientForm (auto-expanded when user not found) */}
      {state === 'form' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
          {/* Info banner when auto-expanded after not finding user */}
          {wasAutoExpanded && (emailValue || phoneValue) && (
            <div className="p-3 rounded-lg bg-info/10 border border-info/20 flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nie znaleziono pacjenta
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode === 'email'
                    ? `Brak użytkownika z emailem "${emailValue}". Uzupełnij dane, aby utworzyć nowego pacjenta.`
                    : `Brak użytkownika z telefonem "+48 ${phoneValue}". Uzupełnij dane, aby utworzyć nowego pacjenta.`
                  }
                </p>
              </div>
            </div>
          )}
          <PatientForm
            defaultValues={{
              email: mode === 'email' && emailValue ? emailValue : '',
              phone: mode === 'phone' && phoneValue ? phoneValue : '',
            }}
            onSubmit={onCreateNewPatient}
            onCancel={onCancel}
            isLoading={isLoading}
            submitLabel="Dodaj pacjenta"
            onDirtyChange={onDirtyChange}
          />
        </div>
      )}

      {/* Cancel button for non-form states */}
      {state !== 'form' && (
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="patient-lookup-cancel-btn"
          >
            Anuluj
          </Button>
        </div>
      )}
    </div>
  );
}
