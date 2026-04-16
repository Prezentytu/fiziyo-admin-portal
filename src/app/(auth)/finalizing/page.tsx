'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';

const POLLING_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

type FinalizingStatus = 'loading' | 'success' | 'timeout';

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
  const [attempt, setAttempt] = useState(0);
  const hasRedirected = useRef(false);

  const checkTokenExchangeReady = useCallback(async (): Promise<boolean> => {
    const clerkToken = await getToken();
    if (!clerkToken) {
      return false;
    }

    try {
      await tokenExchangeService.exchangeClerkToken(clerkToken);
      return true;
    } catch (error) {
      const statusCode = getStatusCode(error);
      if (statusCode === 404) {
        return false;
      }

      if (statusCode === 401) {
        clearBackendToken();
      }

      return false;
    }
  }, [getToken]);

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

    if (status !== 'loading') {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const poll = async () => {
      const isReady = await checkTokenExchangeReady();

      if (isCancelled) {
        return;
      }

      if (isReady) {
        finalizeSuccess();
        return;
      }

      setAttempt((currentAttempt) => {
        const nextAttempt = currentAttempt + 1;
        if (nextAttempt >= MAX_ATTEMPTS) {
          setStatus('timeout');
          return nextAttempt;
        }

        timeoutId = setTimeout(poll, POLLING_INTERVAL_MS);
        return nextAttempt;
      });
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkTokenExchangeReady, finalizeSuccess, isLoaded, isSignedIn, router, status]);

  const handleRetry = () => {
    setAttempt(0);
    setStatus('loading');
  };

  const handleSignOut = async () => {
    clearBackendToken();
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
      {status === 'loading' && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Finalizujemy Twoje konto</h1>
            <p className="text-muted-foreground">
              To może potrwać kilka sekund. Trwa synchronizacja konta z backendem.
            </p>
            <p className="text-sm text-muted-foreground">Próba {attempt + 1}/{MAX_ATTEMPTS}</p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Konto gotowe</h1>
            <p className="text-muted-foreground">Przenosimy Cię do aplikacji...</p>
          </div>
        </>
      )}

      {status === 'timeout' && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">To trwa dłużej niż zwykle</h1>
            <p className="text-muted-foreground">
              Konto jest nadal przygotowywane. Możesz spróbować ponownie lub zalogować się ponownie.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              onClick={handleRetry}
              data-testid="auth-finalizing-retry-btn"
            >
              Spróbuj ponownie
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
              data-testid="auth-finalizing-signout-btn"
            >
              Wyloguj się
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
