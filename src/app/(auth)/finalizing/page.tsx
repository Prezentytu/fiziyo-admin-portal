'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decideAdminAccess } from '@/lib/auth/adminAccessDecision';
import { getUserRoleFromToken } from '@/lib/auth/jwtClaims';
import { clearBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';

const POLLING_INTERVAL_MS = 2000;
// Po tylu próbach pokazujemy dyskretną pomoc, ale polling trwa dalej w tle.
const HELP_AFTER_ATTEMPTS = 30;
// Absolutny limit, by nie pollować w nieskończoność (~3 min przy 2 s interwale).
const MAX_ATTEMPTS = 90;

type FinalizingStatus = 'loading' | 'success' | 'taking-longer';

function getStatusCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const statusValue = (error as { status?: unknown }).status;
    if (typeof statusValue === 'number') {
      return statusValue;
    }
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/\b(4\d{2}|5\d{2})\b/);
    if (statusMatch) {
      return Number(statusMatch[1]);
    }
  }

  return null;
}

export default function FinalizingRegistrationPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  const [status, setStatus] = useState<FinalizingStatus>('loading');
  const [retryToken, setRetryToken] = useState(0);
  const hasRedirected = useRef(false);

  const checkTokenExchangeReady = useCallback(async (): Promise<boolean> => {
    const clerkToken = await getToken();
    if (!clerkToken) {
      return false;
    }

    try {
      const exchangeResult = await tokenExchangeService.exchangeClerkToken(clerkToken);
      const role = getUserRoleFromToken(exchangeResult.access_token);
      const accessDecision = decideAdminAccess({ role });

      if (accessDecision.kind === 'patient') {
        clearBackendToken();
        router.replace('/patient-redirect');
        return false;
      }

      return true;
    } catch (error) {
      const statusCode = getStatusCode(error);
      const errorCode =
        error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
          ? ((error as { code: string }).code ?? null)
          : null;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const accessDecision = decideAdminAccess({
        statusCode,
        errorCode,
        errorMessage,
      });

      if (accessDecision.kind === 'pending') {
        return false;
      }

      if (accessDecision.kind === 'patient') {
        clearBackendToken();
        router.replace('/patient-redirect');
        return false;
      }

      if (statusCode === 401) {
        clearBackendToken();
      }

      return false;
    }
  }, [getToken, router]);

  const finalizeSuccess = useCallback(() => {
    if (hasRedirected.current) {
      return;
    }

    hasRedirected.current = true;
    setStatus('success');
    clearBackendToken();
    setTimeout(() => {
      router.replace('/');
    }, 900);
  }, [router]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace('/login');
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;
    let attempts = 0;

    const poll = async () => {
      const isReady = await checkTokenExchangeReady();

      if (isCancelled) {
        return;
      }

      if (isReady) {
        finalizeSuccess();
        return;
      }

      attempts += 1;

      // Po dłuższym czasie pokazujemy spokojny komunikat i dyskretną pomoc,
      // ale dalej automatycznie ponawiamy - użytkownik nigdy nie musi klikać.
      if (attempts >= HELP_AFTER_ATTEMPTS) {
        setStatus('taking-longer');
      }

      if (attempts >= MAX_ATTEMPTS) {
        return;
      }

      timeoutId = setTimeout(poll, POLLING_INTERVAL_MS);
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkTokenExchangeReady, finalizeSuccess, isLoaded, isSignedIn, router, retryToken]);

  const handleRetry = () => {
    setStatus('loading');
    setRetryToken((token) => token + 1);
  };

  const handleSignOut = async () => {
    clearBackendToken();
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        {status === 'success' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Wszystko gotowe</h1>
              <p className="text-muted-foreground">Przenosimy Cię do aplikacji...</p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {status === 'taking-longer' ? 'Już prawie gotowe' : 'Przygotowujemy Twoje konto'}
              </h1>
              <p className="text-muted-foreground">
                {status === 'taking-longer'
                  ? 'Kończymy konfigurację Twojego konta. Za moment Cię przeniesiemy.'
                  : 'To zajmie tylko chwilę.'}
              </p>
            </div>

            {status === 'taking-longer' && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">Trwa to dłużej niż zwykle?</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRetry}
                  data-testid="auth-finalizing-retry-btn"
                >
                  Odśwież
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleSignOut}
                  data-testid="auth-finalizing-signout-btn"
                >
                  Wyloguj się
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
