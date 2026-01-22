'use client';

import * as React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Search,
  Mail,
  Phone,
  Loader2,
  UserPlus,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { getAvatarGradient, getInitials } from '@/utils/textUtils';

import { FIND_USER_BY_EMAIL_QUERY, FIND_USER_BY_PHONE_QUERY } from '@/graphql/queries/users.queries';
import { ASSIGN_PATIENT_TO_THERAPIST_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { ADD_DIRECT_MEMBER_MUTATION } from '@/graphql/mutations/organizations.mutations';
import { GET_THERAPIST_PATIENTS_QUERY, GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_CURRENT_ORGANIZATION_PLAN } from '@/graphql/queries/organizations.queries';
import type { FindUserByEmailData, FindUserByPhoneData } from '@/graphql/types/user.types';

// ============================================
// TYPES
// ============================================

type ContactType = 'email' | 'phone' | 'unknown';
type ViewState = 'search' | 'found' | 'form';

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

interface TherapistPatientAssignment {
  id: string;
  patientId: string;
  status: string;
}

export interface UnifiedPatientInputProps {
  readonly organizationId: string;
  readonly therapistId: string;
  readonly clinicId?: string;
  readonly onSuccess: (patient: { id: string; fullname: string; email?: string; firstName?: string; lastName?: string }) => void;
  readonly onCreateNewPatient: (values: PatientFormValues) => Promise<void>;
  readonly onCancel: () => void;
  readonly onDirtyChange?: (isDirty: boolean) => void;
  readonly isLoading?: boolean;
}

// ============================================
// FORM SCHEMA
// ============================================

const patientFormSchema = z.object({
  firstName: z.string().min(2, 'Imię musi mieć min. 2 znaki'),
  lastName: z.string().min(2, 'Nazwisko musi mieć min. 2 znaki'),
  contextLabel: z.string().optional(),
});

export type PatientFormValues = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  contextLabel?: string;
};

// ============================================
// UTILITIES
// ============================================

// Detect contact type from input
const detectContactType = (value: string): ContactType => {
  if (value.includes('@')) return 'email';
  const digitsOnly = value.replace(/[\s+\-()]/g, '');
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length >= 7) return 'phone';
  return 'unknown';
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone (9 digits)
const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s+\-()]/g, '');
  return cleanPhone.length === 9 && /^\d+$/.test(cleanPhone);
};

// Extract clean phone number
const getCleanPhone = (phone: string): string => {
  return phone.replace(/[\s+\-()]/g, '');
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

// Quick tags for notes
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

// ============================================
// COMPONENT
// ============================================

export function UnifiedPatientInput({
  organizationId,
  therapistId,
  clinicId,
  onSuccess,
  onCreateNewPatient,
  onCancel,
  onDirtyChange,
  isLoading: externalLoading = false,
}: UnifiedPatientInputProps) {
  // ============================================
  // STATE
  // ============================================
  
  const [contactValue, setContactValue] = useState('');
  const [contactType, setContactType] = useState<ContactType>('unknown');
  const [viewState, setViewState] = useState<ViewState>('search');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  // Refs
  const contactInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced contact value (300ms)
  const debouncedContact = useDebounce(contactValue, 300);

  // Form for new patient
  const form = useForm<z.infer<typeof patientFormSchema>>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      contextLabel: '',
    },
    mode: 'onChange',
  });

  // Track dirty state
  const isDirty = contactValue.length > 0 || form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // ============================================
  // QUERIES
  // ============================================

  // Get therapist's current patients (for duplicate check)
  const { data: therapistPatientsData } = useQuery<{ therapistPatients: TherapistPatientAssignment[] }>(
    GET_ALL_THERAPIST_PATIENTS_QUERY,
    {
      variables: { therapistId, organizationId },
      skip: !therapistId || !organizationId,
    }
  );

  // Query: search by email
  const {
    data: emailData,
    loading: emailLoading,
  } = useQuery<FindUserByEmailData>(FIND_USER_BY_EMAIL_QUERY, {
    variables: { email: debouncedContact },
    skip: contactType !== 'email' || !isValidEmail(debouncedContact),
    fetchPolicy: 'network-only',
  });

  // Query: search by phone
  const {
    data: phoneData,
    loading: phoneLoading,
  } = useQuery<FindUserByPhoneData>(FIND_USER_BY_PHONE_QUERY, {
    variables: { phone: `+48${getCleanPhone(debouncedContact)}` },
    skip: contactType !== 'phone' || !isValidPhone(debouncedContact),
    fetchPolicy: 'network-only',
  });

  const isSearching = emailLoading || phoneLoading;

  // ============================================
  // MUTATIONS
  // ============================================

  const [assignPatient, { loading: assignLoading }] = useMutation(ASSIGN_PATIENT_TO_THERAPIST_MUTATION, {
    refetchQueries: [
      { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_CURRENT_ORGANIZATION_PLAN, variables: { organizationId } },
    ],
    awaitRefetchQueries: true,
  });

  const [addDirectMember, { loading: addMemberLoading }] = useMutation(ADD_DIRECT_MEMBER_MUTATION, {
    awaitRefetchQueries: true,
  });

  const isLoading = externalLoading || assignLoading || addMemberLoading;

  // ============================================
  // EFFECTS
  // ============================================

  // Update contact type on input change
  useEffect(() => {
    const newType = detectContactType(contactValue);
    setContactType(newType);
  }, [contactValue]);

  // Handle search results - EMAIL
  useEffect(() => {
    if (contactType !== 'email' || !isValidEmail(debouncedContact)) return;
    if (emailLoading) return;

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
      setViewState('found');
    } else if (emailData) {
      // Not found - auto morph to form
      setFoundUser(null);
      setViewState('form');
      // Focus on first name after transition
      setTimeout(() => firstNameInputRef.current?.focus(), 100);
    }
  }, [emailData, emailLoading, debouncedContact, contactType]);

  // Handle search results - PHONE
  useEffect(() => {
    if (contactType !== 'phone' || !isValidPhone(debouncedContact)) return;
    if (phoneLoading) return;

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
      setViewState('found');
    } else if (phoneData) {
      // Not found - auto morph to form
      setFoundUser(null);
      setViewState('form');
      // Focus on first name after transition
      setTimeout(() => firstNameInputRef.current?.focus(), 100);
    }
  }, [phoneData, phoneLoading, debouncedContact, contactType]);

  // Reset view state when contact changes
  useEffect(() => {
    if (viewState !== 'search' && !isSearching) {
      const isValid = (contactType === 'email' && isValidEmail(contactValue)) ||
                      (contactType === 'phone' && isValidPhone(contactValue));
      if (!isValid) {
        setViewState('search');
        setFoundUser(null);
      }
    }
  }, [contactValue, contactType, viewState, isSearching]);

  // ============================================
  // COMPUTED
  // ============================================

  const isAlreadyInOrg = foundUser?.organizationIds?.includes(organizationId);
  const existingAssignment = therapistPatientsData?.therapistPatients?.find(
    (assignment) => assignment.patientId === foundUser?.id
  );
  const isAlreadyAssignedToTherapist = !!existingAssignment;

  const foundInitials = foundUser
    ? getInitials(foundUser.personalData?.firstName, foundUser.personalData?.lastName)
    : '?';
  const foundGradient = foundUser
    ? getAvatarGradient(foundUser.personalData?.firstName, foundUser.personalData?.lastName)
    : 'linear-gradient(135deg, #6b7280, #4b5563)';

  // Format contact display
  const formattedContact = useMemo(() => {
    if (contactType === 'phone') {
      const clean = getCleanPhone(contactValue);
      return `+48 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    return contactValue;
  }, [contactValue, contactType]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleContactChange = useCallback((value: string) => {
    // If it looks like a phone number (digits only), limit to 9 digits
    const digitsOnly = value.replaceAll(/[\s+\-()]/g, '');
    const isPhoneLike = /^\d*$/.test(digitsOnly) && !value.includes('@');
    
    if (isPhoneLike && digitsOnly.length > 9) {
      // Limit to 9 digits for phone numbers
      return;
    }
    
    setContactValue(value);
  }, []);

  const handleAddExistingPatient = useCallback(async () => {
    if (!foundUser) return;

    try {
      // Add to organization if not already member
      if (!foundUser.organizationIds?.includes(organizationId)) {
        await addDirectMember({
          variables: {
            organizationId,
            userId: foundUser.id,
            role: 'patient',
          },
        });
      }

      // Assign to therapist
      await assignPatient({
        variables: {
          patientId: foundUser.id,
          therapistId,
          organizationId,
          clinicId: clinicId || null,
          contextType: 'PRIMARY',
          contextLabel: null,
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
      const gqlError = error as { graphQLErrors?: Array<{ message: string }> };
      const errorMessage = gqlError.graphQLErrors?.[0]?.message || 'Nie udało się dodać pacjenta';
      toast.error(errorMessage);
    }
  }, [foundUser, addDirectMember, assignPatient, therapistId, organizationId, clinicId, onSuccess]);

  const handleSubmitNewPatient = useCallback(async (values: z.infer<typeof patientFormSchema>) => {
    const patientData: PatientFormValues = {
      firstName: values.firstName,
      lastName: values.lastName,
      contextLabel: values.contextLabel || undefined,
      ...(contactType === 'email' ? { email: contactValue } : {}),
      ...(contactType === 'phone' ? { phone: getCleanPhone(contactValue) } : {}),
    };

    await onCreateNewPatient(patientData);
  }, [contactType, contactValue, onCreateNewPatient]);

  const handleEditContact = useCallback(() => {
    setViewState('search');
    setTimeout(() => contactInputRef.current?.focus(), 100);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setViewState('search');
    setFoundUser(null);
    setContactValue('');
    form.reset();
    setIsNoteExpanded(false);
    setTimeout(() => contactInputRef.current?.focus(), 100);
  }, [form]);

  // Tag handlers
  const handleAddTag = useCallback((tag: string, currentValue: string, onChange: (value: string) => void) => {
    const normalizedValue = currentValue.toLowerCase();
    const normalizedTag = tag.toLowerCase();
    if (normalizedValue.includes(normalizedTag)) return;
    const newValue = currentValue.trim() ? `${currentValue.trim()}, ${tag}` : tag;
    onChange(newValue);
  }, []);

  const handleRemoveTag = useCallback((tag: string, currentValue: string, onChange: (value: string) => void) => {
    const parts = currentValue.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== tag.toLowerCase());
    onChange(parts.join(', '));
  }, []);

  const isTagAdded = useCallback((tag: string, currentValue: string): boolean => {
    return currentValue.toLowerCase().includes(tag.toLowerCase());
  }, []);

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const key = e.key;
    
    // Escape key handling for all states
    if (key === 'Escape') {
      e.preventDefault();
      if (viewState === 'found') {
        handleBackToSearch();
      } else if (viewState === 'search') {
        onCancel();
      } else if (viewState === 'form') {
        handleEditContact();
      }
      return;
    }
    
    // Enter key in found state
    if (key === 'Enter' && viewState === 'found' && foundUser) {
      e.preventDefault();
      if (isAlreadyAssignedToTherapist) {
        globalThis.location.href = `/patients/${foundUser.id}`;
      } else {
        handleAddExistingPatient();
      }
    }
  }, [viewState, foundUser, isAlreadyAssignedToTherapist, handleAddExistingPatient, handleBackToSearch, onCancel, handleEditContact]);

  // ============================================
  // RENDER
  // ============================================

  // Contact type icon
  const ContactIcon = contactType === 'email' ? Mail : contactType === 'phone' ? Phone : Search;

  return (
    <div 
      ref={containerRef} 
      className="space-y-6"
      onKeyDown={handleKeyDown}
    >
      {/* SEARCH STATE */}
      {viewState === 'search' && (
        <div className="animate-in fade-in duration-200">
          {/* Main input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                ref={contactInputRef}
                type="text"
                placeholder="Wpisz email lub telefon pacjenta..."
                value={contactValue}
                onChange={(e) => handleContactChange(e.target.value)}
                className={cn(
                  "h-14 text-lg pr-14 transition-all duration-200",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                )}
                autoFocus
                autoComplete="off"
                data-testid="patient-unified-input"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isSearching && (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                )}
                {!isSearching && (
                  <ContactIcon className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    contactType !== 'unknown' ? "text-primary" : "text-muted-foreground/50"
                  )} />
                )}
              </div>
            </div>

            {/* Status message */}
            {isSearching && (
              <p className="text-sm text-primary animate-pulse flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Szukam pacjenta...
              </p>
            )}
          </div>

          {/* Cancel button */}
          <div className="flex justify-end pt-6 border-t border-border mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="patient-unified-cancel-btn"
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}

      {/* FOUND STATE */}
      {viewState === 'found' && foundUser && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Found user card */}
          <div className={cn(
            "p-4 rounded-xl border",
            isAlreadyAssignedToTherapist
              ? "border-warning/30 bg-warning/5"
              : "border-primary/30 bg-primary/5"
          )} data-testid="patient-unified-found-card">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className={cn("h-4 w-4", isAlreadyAssignedToTherapist ? "text-warning" : "text-primary")} />
              <span className={cn("text-sm font-medium", isAlreadyAssignedToTherapist ? "text-warning" : "text-primary")}>
                {isAlreadyAssignedToTherapist && 'Pacjent jest już na Twojej liście'}
                {!isAlreadyAssignedToTherapist && isAlreadyInOrg && 'Pacjent już w organizacji'}
                {!isAlreadyAssignedToTherapist && !isAlreadyInOrg && 'Znaleziono pacjenta w systemie'}
              </span>
            </div>

            {/* User info */}
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
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {isAlreadyAssignedToTherapist ? (
                <Button
                  variant="outline"
                  onClick={() => { globalThis.location.href = `/patients/${foundUser.id}`; }}
                  className="flex-1 h-11"
                  data-testid="patient-unified-go-to-profile-btn"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Przejdź do profilu
                </Button>
              ) : (
                <Button
                  onClick={handleAddExistingPatient}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-linear-to-r from-primary to-primary-dark shadow-lg shadow-primary/20"
                  data-testid="patient-unified-add-existing-btn"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Dodaj do moich pacjentów
                </Button>
              )}
            </div>

            {/* Back link */}
            <button
              type="button"
              onClick={handleBackToSearch}
              className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              ← Wróć do wyszukiwania
            </button>
          </div>
        </div>
      )}

      {/* FORM STATE (Auto-morphed when not found) */}
      {viewState === 'form' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Contact badge */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-light border border-border/60">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  contactType === 'email' ? "bg-info/10" : "bg-primary/10"
                )}>
                  <ContactIcon className={cn(
                    "h-4 w-4",
                    contactType === 'email' ? "text-info" : "text-primary"
                  )} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {contactType === 'email' ? 'Email' : 'Telefon'}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {formattedContact}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEditContact}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Zmień
              </Button>
            </div>

            {/* Info banner */}
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-info" />
              Nie znaleziono pacjenta. Uzupełnij dane:
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitNewPatient)} className="space-y-6">
              {/* Name fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Imię <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={firstNameInputRef}
                          placeholder="Jan"
                          autoComplete="given-name"
                          className="h-11 text-base"
                          data-testid="patient-unified-firstname-input"
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
                      <FormLabel className="text-sm">
                        Nazwisko <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Kowalski"
                          autoComplete="family-name"
                          className="h-12 text-base"
                          data-testid="patient-unified-lastname-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Collapsible note section */}
              <div>
                {!isNoteExpanded ? (
                  <button
                    type="button"
                    onClick={() => setIsNoteExpanded(true)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="patient-unified-expand-note-btn"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Dodaj notatkę
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsNoteExpanded(false)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Ukryj notatkę
                    </button>

                    <FormField
                      control={form.control}
                      name="contextLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Notatka</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="np. Ból pleców, Rehabilitacja kolana..."
                              className="h-12 text-base"
                              data-testid="patient-unified-note-input"
                            />
                          </FormControl>

                          {/* Quick tags */}
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
                                        {isAdded && <X className="h-3 w-3 ml-0.5" />}
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
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  data-testid="patient-unified-form-cancel-btn"
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[140px] bg-linear-to-r from-primary to-primary-dark shadow-lg shadow-primary/20"
                  data-testid="patient-unified-form-submit-btn"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Dodaj pacjenta
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
