'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailWarning,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import {
  PASSWORD_STRENGTH_LABELS,
  calculatePasswordStrength,
  maskEmail,
  type PasswordStrengthScore,
} from '@/features/auth/utils/passwordStrength';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const STRENGTH_BAR_CLASSES: Record<PasswordStrengthScore, string> = {
  0: 'bg-border',
  1: 'bg-error',
  2: 'bg-warning',
  3: 'bg-primary/70',
  4: 'bg-primary',
};

const STRENGTH_TEXT_CLASSES: Record<PasswordStrengthScore, string> = {
  0: 'text-muted-foreground',
  1: 'text-error',
  2: 'text-warning',
  3: 'text-primary',
  4: 'text-primary',
};

interface ClerkFormError {
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  message?: string;
}

interface SubmitValidationInput {
  emailParam: string;
  code: string;
  password: string;
  passwordsMatch: boolean;
}

function validateResetPasswordSubmit({ emailParam, code, password, passwordsMatch }: SubmitValidationInput): string | null {
  if (!emailParam) return 'Brakuje adresu email. Wróć do logowania i rozpocznij reset ponownie.';
  if (code.length !== OTP_LENGTH) return 'Wpisz pełny 6-cyfrowy kod z emaila.';
  if (password.length < 8) return 'Hasło musi mieć minimum 8 znaków.';
  if (!passwordsMatch) return 'Hasła nie są identyczne.';
  return null;
}

function getResetPasswordError(err: unknown): string {
  const error = err as ClerkFormError;
  const errorCode = error?.errors?.[0]?.code;
  const errorMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || '';

  switch (errorCode) {
    case 'form_code_incorrect':
      return 'Nieprawidłowy kod. Sprawdź email i spróbuj ponownie.';
    case 'verification_expired':
    case 'verification_failed':
      return 'Kod wygasł. Wyślij nowy kod, aby kontynuować.';
    case 'form_password_pwned':
      return 'To hasło pojawiło się w znanych wyciekach danych. Wybierz inne.';
    case 'form_password_length_too_short':
      return 'Hasło jest za krótkie. Użyj minimum 8 znaków.';
    case 'form_password_not_strong_enough':
      return 'Hasło jest zbyt słabe. Dodaj wielkie litery, cyfry lub znaki specjalne.';
    case 'form_password_validation_failed':
      return errorMessage || 'Hasło nie spełnia wymagań bezpieczeństwa.';
    case 'form_identifier_not_found':
      return 'Nie znaleziono użytkownika z tym adresem email.';
    case 'too_many_requests':
      return 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.';
    case 'session_exists':
      return 'Jesteś już zalogowany.';
    default:
      if (errorMessage) return errorMessage;
      return 'Wystąpił błąd. Spróbuj ponownie.';
  }
}

interface StrengthIndicatorProps {
  score: PasswordStrengthScore;
  visible: boolean;
}

function StrengthIndicator({ score, visible }: Readonly<StrengthIndicatorProps>) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2" data-testid="auth-reset-strength">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              score >= level ? STRENGTH_BAR_CLASSES[score] : 'bg-border'
            )}
          />
        ))}
      </div>
      <span className={cn('min-w-16 text-right text-xs font-medium', STRENGTH_TEXT_CLASSES[score])}>
        {PASSWORD_STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}

interface CriteriaListProps {
  criteria: { minLength: boolean; hasNumber: boolean; hasUppercase: boolean; hasSpecial: boolean };
  visible: boolean;
}

function CriteriaList({ criteria, visible }: Readonly<CriteriaListProps>) {
  if (!visible) return null;

  const items = [
    { met: criteria.minLength, label: 'Minimum 8 znaków' },
    { met: criteria.hasUppercase, label: 'Wielka litera' },
    { met: criteria.hasNumber, label: 'Cyfra' },
    { met: criteria.hasSpecial, label: 'Znak specjalny' },
  ];

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs" aria-label="Wymagania hasła">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            'flex items-center gap-1.5 transition-colors',
            item.met ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <span
            className={cn(
              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
              item.met ? 'border-primary bg-primary/15' : 'border-border'
            )}
          >
            {item.met && <CheckCircle2 className="h-3 w-3 text-primary" />}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function MissingEmailState() {
  return (
    <div className="space-y-6" data-testid="auth-reset-missing-email">
      <Link
        href="/sign-in"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do logowania
      </Link>

      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
          <MailWarning className="h-8 w-8 text-warning" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Link resetu jest niekompletny</h1>
        <p className="text-muted-foreground">
          Nie mamy adresu email powiązanego z tym żądaniem. Wróć do logowania i rozpocznij reset hasła ponownie.
        </p>
      </div>

      <Button
        asChild
        className="h-11 w-full rounded-xl text-base font-semibold"
        data-testid="auth-reset-back-to-signin-btn"
      >
        <Link href="/sign-in">Wróć do logowania</Link>
      </Button>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="space-y-6 text-center" data-testid="auth-reset-success">
      <div className="flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Hasło zostało zmienione</h1>
        <p className="text-muted-foreground">Logujemy Cię do panelu...</p>
      </div>
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function ResetPasswordPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const autoFocusedPasswordRef = useRef(false);

  const maskedEmail = useMemo(() => (emailParam ? maskEmail(emailParam) : ''), [emailParam]);

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = globalThis.setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => globalThis.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (code.length === OTP_LENGTH && !autoFocusedPasswordRef.current) {
      autoFocusedPasswordRef.current = true;
      passwordRef.current?.focus();
    }
    if (code.length < OTP_LENGTH) {
      autoFocusedPasswordRef.current = false;
    }
  }, [code]);

  const handleResend = useCallback(async () => {
    if (!isLoaded || !signIn || !emailParam) return;
    if (resendCooldown > 0 || resendLoading) return;

    try {
      setError(null);
      setResendNotice(null);
      setResendLoading(true);

      await signIn.create({
        identifier: emailParam,
        strategy: 'reset_password_email_code',
      });

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendNotice('Wysłaliśmy nowy kod. Sprawdź skrzynkę pocztową.');
      globalThis.setTimeout(() => setResendNotice(null), 6000);
    } catch (err) {
      console.error('Resend reset code error:', err);
      setError(getResetPasswordError(err));
    } finally {
      setResendLoading(false);
    }
  }, [isLoaded, signIn, emailParam, resendCooldown, resendLoading]);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    !!emailParam &&
    code.length === OTP_LENGTH &&
    password.length >= 8 &&
    passwordsMatch &&
    strength.score >= 2 &&
    !loading &&
    !success;

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!isLoaded || !signIn) {
        setError('System resetowania hasła jest niedostępny. Spróbuj ponownie później.');
        return;
      }

      const validationError = validateResetPasswordSubmit({ emailParam, code, password, passwordsMatch });
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code,
          password,
        });

        if (result.status === 'complete') {
          setSuccess(true);
          await setActive({ session: result.createdSessionId });
          globalThis.setTimeout(() => router.replace('/'), 600);
          return;
        }

        if (result.status === 'needs_second_factor') {
          setTwoFactorRequired(true);
          setError(
            'Twoje konto wymaga drugiego składnika uwierzytelniania. Skontaktuj się z administratorem, aby dokończyć reset hasła.'
          );
          return;
        }

        setError('Nie udało się zresetować hasła. Spróbuj ponownie.');
      } catch (err) {
        console.error('Reset password error:', err);
        setError(getResetPasswordError(err));
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signIn, emailParam, code, password, passwordsMatch, setActive, router]
  );

  if (!emailParam) return <MissingEmailState />;
  if (success) return <SuccessState />;

  const resendDisabled = resendCooldown > 0 || resendLoading || twoFactorRequired;

  return (
    <div className="space-y-6">
      <Link
        href="/sign-in"
        data-testid="auth-reset-back-link"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do logowania
      </Link>

      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ustaw nowe hasło</h1>
        <p className="text-sm text-muted-foreground">
          Wysłaliśmy 6-cyfrowy kod na <span className="font-medium text-foreground">{maskedEmail}</span>. Wygasa za 10
          minut.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-3">
          <Label htmlFor="reset-code" className="text-center block">
            Kod weryfikacyjny
          </Label>
          <div className="flex justify-center">
            <InputOTP
              id="reset-code"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(value) => {
                setCode(value);
                setError(null);
              }}
              autoFocus
              data-testid="auth-reset-code-input"
              aria-describedby={error ? 'auth-reset-error' : undefined}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendDisabled}
              data-testid="auth-reset-resend-btn"
              className={cn(
                'inline-flex items-center gap-1.5 font-medium transition-colors',
                resendDisabled
                  ? 'cursor-not-allowed text-muted-foreground/70'
                  : 'text-primary hover:text-primary-light'
              )}
            >
              {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {resendCooldown > 0 ? `Wyślij ponownie (${resendCooldown}s)` : 'Wyślij kod ponownie'}
            </button>
          </div>

          {resendNotice && (
            <output
              className="block rounded-lg bg-primary/10 px-3 py-2 text-center text-xs text-primary"
              data-testid="auth-reset-resend-notice"
            >
              {resendNotice}
            </output>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nowe hasło</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={passwordRef}
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 znaków"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                className="h-11 pl-10 pr-11"
                autoComplete="new-password"
                data-testid="auth-reset-password-input"
                aria-describedby="auth-reset-strength-hint"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                data-testid="auth-reset-show-password-btn"
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-light hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div id="auth-reset-strength-hint" className="space-y-2">
              <StrengthIndicator score={strength.score} visible={password.length > 0} />
              <CriteriaList criteria={strength.criteria} visible={password.length > 0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Potwierdź hasło</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Powtórz nowe hasło"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError(null);
                }}
                className={cn(
                  'h-11 pl-10 pr-11',
                  confirmPassword.length > 0 && !passwordsMatch && 'border-error focus-visible:ring-error/50'
                )}
                autoComplete="new-password"
                data-testid="auth-reset-confirm-input"
                aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                data-testid="auth-reset-show-confirm-btn"
                aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-light hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-error" data-testid="auth-reset-mismatch">
                Hasła nie są identyczne.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div
            id="auth-reset-error"
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error"
            data-testid="auth-reset-error"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/10"
          data-testid="auth-reset-submit-btn"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zresetuj hasło i zaloguj'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Pamiętasz hasło?{' '}
          <Link href="/sign-in" className="font-semibold text-primary hover:text-primary-light">
            Wróć do logowania
          </Link>
        </p>
      </form>
    </div>
  );
}
