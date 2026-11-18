'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUPPORT_EMAIL } from '@/lib/support';
import { CODE_HELP_DELAY_S, CODE_HELP_MAILTO_URL } from '@/lib/auth/verificationCodeHelp';
import { parseRegistrationError } from '@/lib/auth/registrationErrors';
import { rememberRegistrationAttempt, reportRegistrationStep } from '@/lib/registrationAttempts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rejestracja w portalu zawsze zakłada konto gabinetu (isCompanyAccount: true w register/page.tsx).
const ACCOUNT_KIND = 'company' as const;

export default function VerifyEmailPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showCodeHelp, setShowCodeHelp] = useState(false);
  // Każda udana wysyłka nowego kodu zwiększa licznik i od nowa odmierza czas do podpowiedzi.
  const [codeSentCount, setCodeSentCount] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  /** Adres po poprawce; obiekt `signUp` z hooka może odświeżyć się dopiero przy następnym renderze. */
  const [correctedEmail, setCorrectedEmail] = useState<string | null>(null);
  const [emailChangedTo, setEmailChangedTo] = useState<string | null>(null);

  const email = correctedEmail ?? signUp?.emailAddress ?? null;

  useEffect(() => {
    setShowCodeHelp(false);
    const timer = setTimeout(() => setShowCodeHelp(true), CODE_HELP_DELAY_S * 1000);
    return () => clearTimeout(timer);
  }, [codeSentCount]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isLoaded || !signUp) {
        setError('System weryfikacji niedostępny. Spróbuj ponownie później.');
        return;
      }

      if (!code.trim()) {
        setError('Wprowadź kod weryfikacyjny');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });

        if (result.status === 'complete') {
          reportRegistrationStep({
            signUpId: signUp.id,
            step: 'code_verified',
            accountKind: ACCOUNT_KIND,
            email,
          });
          if (signUp.id) rememberRegistrationAttempt({ signUpId: signUp.id, accountKind: ACCOUNT_KIND });
          await setActive({ session: result.createdSessionId });
          router.replace('/finalizing');
        } else {
          setError('Weryfikacja nie powiodła się. Spróbuj ponownie.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        const error = err as {
          errors?: Array<{ code?: string; message?: string }>;
        };
        const errorCode = error?.errors?.[0]?.code;

        // Tylko zły albo wygasły kod; błąd setActive po `complete` to nie próba kodu.
        if (
          errorCode === 'form_code_incorrect' ||
          errorCode === 'verification_failed' ||
          errorCode === 'verification_expired'
        ) {
          reportRegistrationStep({
            signUpId: signUp.id,
            step: 'code_error',
            accountKind: ACCOUNT_KIND,
            email,
          });
        }

        switch (errorCode) {
          case 'form_code_incorrect':
          case 'verification_failed':
            setError('Nieprawidłowy kod weryfikacyjny');
            // Pierwszy zły kod: nie czekamy, od razu podpowiedź (sprawdź adres, Spam, kontakt).
            setShowCodeHelp(true);
            break;
          case 'verification_expired':
            setError('Kod weryfikacyjny wygasł. Wyślij nowy kod.');
            setShowCodeHelp(true);
            break;
          default:
            setError('Wystąpił błąd podczas weryfikacji. Spróbuj ponownie.');
        }
      } finally {
        setLoading(false);
      }
    },
    [code, email, isLoaded, signUp, setActive, router]
  );

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) {
      setError('System niedostępny. Spróbuj ponownie później.');
      return;
    }

    try {
      setResending(true);
      setError('');
      setResendSuccess(false);

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      reportRegistrationStep({
        signUpId: signUp.id,
        step: 'code_resent',
        accountKind: ACCOUNT_KIND,
        email,
      });
      setResendSuccess(true);
      setEmailChangedTo(null);
      setCodeSentCount((count) => count + 1);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error('Resend error:', err);
      setError('Nie udało się wysłać nowego kodu. Spróbuj ponownie.');
    } finally {
      setResending(false);
    }
  };

  const startEmailEdit = () => {
    setEmailDraft(email ?? '');
    setEmailError('');
    setEditingEmail(true);
  };

  /** Poprawia adres w trwającej rejestracji: hasło i dane gabinetu zostają w Clerku, kod idzie na nowy adres. */
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingEmail) return;
    const next = emailDraft.trim();
    if (!EMAIL_PATTERN.test(next)) {
      setEmailError('Sprawdź adres e-mail. Powinien wyglądać tak: nazwa@poczta.pl.');
      return;
    }
    // Ten sam adres: bez komunikatu, po prostu nowy kod na ten adres.
    if (next.toLowerCase() === (email ?? '').toLowerCase()) {
      setEditingEmail(false);
      await handleResendCode();
      return;
    }
    if (!isLoaded || !signUp) {
      setEmailError('System niedostępny. Spróbuj ponownie później.');
      return;
    }

    try {
      setSavingEmail(true);
      const updated = await signUp.update({ emailAddress: next });
      await updated.prepareEmailAddressVerification({ strategy: 'email_code' });
      const sentTo = updated.emailAddress ?? next;
      reportRegistrationStep({
        signUpId: updated.id,
        step: 'code_resent',
        accountKind: ACCOUNT_KIND,
        email: sentTo,
      });
      setCorrectedEmail(sentTo);
      setEmailChangedTo(sentTo);
      setEditingEmail(false);
      setCode('');
      setError('');
      setResendSuccess(false);
      setCodeSentCount((count) => count + 1);
    } catch (err) {
      console.error('Change email error:', err);
      setEmailError(parseRegistrationError(err).message);
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/register"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót
      </Link>

      {/* Icon */}
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sprawdź swoją skrzynkę</h1>
        {editingEmail ? null : email ? (
          <>
            <p className="text-muted-foreground">Wysłaliśmy kod weryfikacyjny na adres</p>
            <p className="break-all font-semibold text-foreground" data-testid="auth-verify-email">
              {email} ·{' '}
              <button
                type="button"
                onClick={startEmailEdit}
                data-testid="auth-verify-change-email-btn"
                className="font-medium text-primary hover:underline"
              >
                Zmień adres
              </button>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            Wysłaliśmy kod weryfikacyjny na Twój adres email. Wprowadź go poniżej, aby dokończyć rejestrację.
          </p>
        )}
      </div>

      {editingEmail && (
        <form
          onSubmit={handleChangeEmail}
          className="space-y-3 rounded-xl bg-card p-4"
          data-testid="auth-verify-email-form"
        >
          <div className="space-y-2">
            <Label htmlFor="new-email">Poprawny adres email</Label>
            <Input
              id="new-email"
              type="email"
              value={emailDraft}
              onChange={(e) => {
                setEmailDraft(e.target.value);
                setEmailError('');
              }}
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(emailError)}
              data-testid="auth-verify-email-input"
            />
            {emailError && (
              <p className="text-sm text-error" data-testid="auth-verify-email-error">
                {emailError}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={savingEmail}
              className="h-11 flex-1 rounded-xl"
              data-testid="auth-verify-email-save-btn"
            >
              {savingEmail ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Wyślij kod na ten adres'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingEmail}
              onClick={() => setEditingEmail(false)}
              className="h-11 rounded-xl"
              data-testid="auth-verify-email-cancel-btn"
            >
              Anuluj
            </Button>
          </div>
        </form>
      )}

      {emailChangedTo && !editingEmail && (
        <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary" data-testid="auth-verify-email-changed">
          Wysłaliśmy kod na nowy adres {emailChangedTo}.
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Kod weryfikacyjny</Label>
          <Input
            id="code"
            type="text"
            placeholder="Wprowadź 6-cyfrowy kod"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            className="h-11 text-center text-lg tracking-widest"
            autoComplete="one-time-code"
            autoFocus
            data-testid="auth-verify-code-input"
          />
        </div>

        {error && <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

        {resendSuccess && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">Nowy kod został wysłany na Twój email</div>
        )}

        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-11 w-full rounded-xl text-base font-semibold"
          data-testid="auth-verify-submit-btn"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zweryfikuj email'}
        </Button>
      </form>

      {showCodeHelp && (
        <div
          role="status"
          className="space-y-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground"
          data-testid="auth-verify-code-help"
        >
          <p className="flex items-center gap-2 font-medium text-foreground">
            <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
            Kod nie dochodzi?
          </p>
          <p>Sprawdź skrzynkę odbiorczą, także foldery Spam i Oferty. Wiadomość może przyjść z opóźnieniem.</p>
          <p>Sprawdź też, czy adres powyżej jest poprawny.</p>
          <p>
            Jeśli kod dalej nie dochodzi albo problem jest inny, daj nam znać:{' '}
            <a
              href={CODE_HELP_MAILTO_URL}
              className="font-medium text-primary underline-offset-4 hover:underline"
              data-testid="auth-verify-code-help-mail"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      )}

      {/* Resend */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resending}
          data-testid="auth-verify-resend-btn"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Nie dostałeś kodu? Wyślij ponownie
        </button>
      </div>
    </div>
  );
}
