'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Mail, Lock, User, Phone, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
                ? 'bg-primary text-primary-foreground'
                : currentStep === step.id
                ? 'bg-primary text-primary-foreground'
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

export default function CompanyRegistrationPage() {
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
      });

      try {
        await signUp.update({
          unsafeMetadata: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            companyName: formData.companyName.trim() || generatedName,
            isCompanyAccount: true,
            organizationType: 'individual',
          },
        });
      } catch (updateError) {
        console.error('Error setting company metadata:', updateError);
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      router.push('/verify');
    } catch (err) {
      console.error('Registration error:', err);
      const error = err as {
        errors?: Array<{ message?: string }>;
        message?: string;
      };
      const errorMessage = error?.errors?.[0]?.message || error?.message || 'Nieznany błąd';
      setError(`Błąd rejestracji: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={currentStep > 1 ? handlePrevStep : undefined}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {currentStep > 1 ? (
          <>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wstecz
          </>
        ) : (
          <Link href="/register" className="inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Link>
        )}
      </button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Utwórz konto firmowe</h1>
        <p className="text-muted-foreground">
          {currentStep === 1 && 'Podaj adres email do logowania'}
          {currentStep === 2 && 'Utwórz bezpieczne hasło'}
          {currentStep === 3 && 'Uzupełnij dane osobowe i firmy'}
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

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
                  placeholder="jan@firma.pl"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {currentStep === 2 && (
          <div className="space-y-4">
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
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Personal data */}
        {currentStep === 3 && (
          <div className="space-y-4">
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
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+48 123 456 789"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nazwa praktyki / gabinetu</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="np. Fizjoterapia Jan Kowalski"
                  value={formData.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Możesz zmienić tę nazwę później w ustawieniach</p>
            </div>
          </div>
        )}

        {/* Clerk CAPTCHA */}
        <div id="clerk-captcha" className="mt-4" />

        {/* Error message */}
        {error && <div className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

        {/* Actions */}
        <div className="mt-6">
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold">
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
        <Link href="/sign-in" className="font-semibold text-primary hover:text-primary-light">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}



