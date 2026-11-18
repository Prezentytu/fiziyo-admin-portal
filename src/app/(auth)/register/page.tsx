'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Mail, Lock, User, Building2, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { parseRegistrationError, type RegistrationErrorView } from '@/lib/auth/registrationErrors';
import { readPendingRegistration, REGISTER_BACK_PARAM } from '@/lib/auth/pendingRegistration';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  companyNameEdited: boolean;
}

const STEPS = [
  { id: 1, name: 'Email' },
  { id: 2, name: 'Hasło' },
  { id: 3, name: 'Dane' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
              currentStep > step.id
                ? 'bg-tint-fill text-on-tint'
                : currentStep === step.id
                  ? 'bg-tint-fill text-on-tint'
                  : 'bg-surface-light text-muted-foreground'
            )}
          >
            {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn('mx-2 h-0.5 w-8 transition-colors', currentStep > step.id ? 'bg-primary' : 'bg-border')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function generatePracticeName(firstName: string, lastName: string): string {
  if (!firstName.trim() || !lastName.trim()) return '';
  return `${firstName.trim()} ${lastName.trim()} - Fizjoterapia`;
}

interface PracticeNamePreviewProps {
  name: string;
  onEdit: () => void;
}

function PracticeNamePreview({ name, onEdit }: PracticeNamePreviewProps) {
  if (!name) return null;

  return (
    <button
      type="button"
      onClick={onEdit}
      data-testid="auth-register-company-edit-btn"
      className="mb-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-light"
    >
      <div className="flex flex-1 items-center gap-3">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Nazwa praktyki</p>
          <p className="font-medium text-foreground">{name}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-md bg-surface-light px-2 py-1">
        <Pencil className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Edytuj</span>
      </div>
    </button>
  );
}

export default function RegisterPage() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    companyNameEdited: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** Błąd z Clerk z linkiem „Zmień hasło” / „Zmień adres e-mail”; dane formularza zostają. */
  const [clerkError, setClerkError] = useState<RegistrationErrorView>();
  // Link tylko przy komunikacie, do którego należy; walidacja kroku ustawia własny tekst bez linku.
  const errorFix = clerkError && clerkError.message === error ? clerkError.fix : undefined;
  const [showNameEditor, setShowNameEditor] = useState(false);
  /** Powrót z /verify: dane wróciły z trwającej rejestracji, trzeba tylko wpisać hasło jeszcze raz. */
  const [restored, setRestored] = useState(false);

  // „Powrót” z /verify: wypełnij formularz z trwającej rejestracji Clerk (hasła Clerk nie oddaje).
  useEffect(() => {
    if (!isLoaded || restored) return;
    if (!new URLSearchParams(window.location.search).has(REGISTER_BACK_PARAM)) return;
    const pending = readPendingRegistration(signUp);
    if (!pending) return;
    setFormData((prev) => ({
      ...prev,
      ...pending,
      companyNameEdited:
        pending.companyName !== '' && pending.companyName !== generatePracticeName(pending.firstName, pending.lastName),
    }));
    setCurrentStep(2);
    setRestored(true);
  }, [isLoaded, signUp, restored]);

  const generatedName = useMemo(
    () => generatePracticeName(formData.firstName, formData.lastName),
    [formData.firstName, formData.lastName]
  );

  useEffect(() => {
    if (!formData.companyNameEdited && generatedName) {
      setFormData((prev) => ({ ...prev, companyName: generatedName }));
    }
  }, [generatedName, formData.companyNameEdited]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const goToStepToFix = useCallback((step: number) => {
    setCurrentStep(step);
    setError('');
  }, []);

  const handleCompanyNameChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      companyName: value,
      companyNameEdited: true,
    }));
    setError('');
  }, []);

  const validateStep1 = useCallback((): boolean => {
    if (!formData.email.trim()) {
      setError('Podaj adres email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Podaj poprawny adres email');
      return false;
    }
    return true;
  }, [formData.email]);

  const validateStep2 = useCallback((): boolean => {
    if (!formData.password) {
      setError('Podaj hasło');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      return false;
    }
    return true;
  }, [formData.password, formData.confirmPassword]);

  const validateStep3 = useCallback((): boolean => {
    if (!formData.firstName.trim()) {
      setError('Podaj swoje imię');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Podaj swoje nazwisko');
      return false;
    }
    return true;
  }, [formData.firstName, formData.lastName]);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setError('');
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      setError('');
    }
  }, [currentStep, validateStep1, validateStep2]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setError('');
    }
  }, [currentStep]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    if (!isLoaded || !signUp) {
      setError('System rejestracji niedostępny. Spróbuj ponownie później.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        unsafeMetadata: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          companyName: formData.companyName.trim() || generatedName,
          isCompanyAccount: true,
        },
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      router.push('/verify');
    } catch (err) {
      console.error('Registration error:', err);
      const view = parseRegistrationError(err);
      setClerkError(view);
      setError(view.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={currentStep > 1 ? handlePrevStep : undefined}
        data-testid="auth-register-back-btn"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {currentStep > 1 ? (
          <>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wstecz
          </>
        ) : (
          <Link href="/sign-in" className="inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do logowania
          </Link>
        )}
      </button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Utwórz konto fizjoterapeuty</h1>
        <p className="text-sm text-muted-foreground">Kilka kroków i możesz zacząć pracę z pacjentami.</p>
      </div>

      {/* Step indicator */}
      <div data-testid="auth-register-step-indicator">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Forms */}
      <form
        onSubmit={
          currentStep === 3
            ? handleRegistration
            : (e) => {
                e.preventDefault();
                handleNextStep();
              }
        }
      >
        {/* Step 1: Email */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@fizjoterapia.pl"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  autoFocus
                  data-testid="auth-register-email-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div
              data-testid="auth-register-email-banner-2"
              className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-muted-foreground"
            >
              <span className="min-w-0 break-all">
                Konto dla: <span className="font-semibold text-foreground">{formData.email.trim()}</span>
              </span>
              <button
                type="button"
                onClick={() => goToStepToFix(1)}
                data-testid="auth-register-email-banner-2-change"
                className="shrink-0 font-medium text-primary hover:underline"
              >
                zmień
              </button>
            </div>
            {restored && !formData.password && (
              <p data-testid="auth-register-restored" className="text-sm text-muted-foreground">
                Twoje dane zostały. Wpisz hasło jeszcze raz.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 znaków"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="new-password"
                  autoFocus
                  data-testid="auth-register-password-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz hasło"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="new-password"
                  data-testid="auth-register-password-confirm-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Personal data */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div
              data-testid="auth-register-email-banner-3"
              className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-muted-foreground"
            >
              <span className="min-w-0 break-all">
                Konto dla: <span className="font-semibold text-foreground">{formData.email.trim()}</span>
              </span>
              <button
                type="button"
                onClick={() => goToStepToFix(1)}
                data-testid="auth-register-email-banner-3-change"
                className="shrink-0 font-medium text-primary hover:underline"
              >
                zmień
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jan"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="h-11 pl-10"
                    autoComplete="given-name"
                    autoFocus
                    data-testid="auth-register-firstname-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Kowalski"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="h-11 pl-10"
                    autoComplete="family-name"
                    data-testid="auth-register-lastname-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <PhoneInput
                id="phone"
                placeholder="123 456 789"
                value={formData.phone}
                onChange={(value) => handleInputChange('phone', value)}
                className="h-11"
                data-testid="auth-register-phone-input"
              />
            </div>

            {/* Practice name preview/editor */}
            {showNameEditor ? (
              <div className="space-y-2">
                <Label htmlFor="companyName">Nazwa praktyki</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="np. Jan Kowalski - Fizjoterapia"
                    value={formData.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="h-11 pl-10"
                    autoFocus
                    onBlur={() => setShowNameEditor(false)}
                    data-testid="auth-register-company-input"
                  />
                </div>
              </div>
            ) : (
              <PracticeNamePreview
                name={formData.companyName || generatedName}
                onEdit={() => setShowNameEditor(true)}
              />
            )}
          </div>
        )}

        {/* Clerk CAPTCHA */}
        <div id="clerk-captcha" className="mt-4" />

        {/* Error message */}
        {error && (
          <div data-testid="auth-register-error" className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error">
            <p>{error}</p>
            {errorFix && (
              <button
                type="button"
                onClick={() => goToStepToFix(errorFix.step)}
                data-testid="auth-register-error-fix"
                className="mt-1 font-semibold text-primary underline underline-offset-4"
              >
                {errorFix.label} →
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl text-base font-semibold"
            data-testid={currentStep < 3 ? 'auth-register-next-btn' : 'auth-register-submit-btn'}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : currentStep < 3 ? (
              <>
                Dalej
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Utwórz konto'
            )}
          </Button>
        </div>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <Link
          href="/sign-in"
          data-testid="auth-register-login-link"
          className="font-semibold text-primary hover:text-primary-light"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
