'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Building2, RefreshCw, LogOut, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { clearBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';

type OnboardingStatus = 'checking' | 'success' | 'error' | 'waiting';

const GENERIC_ERROR_MESSAGE = 'Konfiguracja Twojego konta trwa dłużej niż zwykle. Spróbuj jeszcze raz za chwilę.';

/**
 * Strona onboardingu - automatycznie tworzy organizację dla nowego użytkownika
 * Używa metadanych z Clerk do utworzenia organizacji w backendzie
 */
export default function OnboardingPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<OnboardingStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const userId = user?.id;

  const metadata = user?.unsafeMetadata as
    | {
        firstName?: string;
        lastName?: string;
        companyName?: string;
      }
    | undefined;

  const organizationName =
    metadata?.companyName || `${metadata?.firstName || ''} ${metadata?.lastName || ''} - Fizjoterapia`.trim();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatus('checking');
    setError(null);

    async function exchange() {
      try {
        const clerkToken = await getToken();
        if (cancelled) return;
        if (!clerkToken) throw Object.assign(new Error('Missing session'), { status: 401 });
        const result = await tokenExchangeService.exchangeClerkToken(clerkToken);
        if (cancelled) return;
        if (!result.access_token) throw new Error('Missing backend token');
        setStatus('success');
        clearBackendToken();
        timer = setTimeout(() => {
          globalThis.location.replace(new URL('/', globalThis.location.href).href);
        }, 1500);
      } catch (failure) {
        if (cancelled) return;
        const httpStatus = failure && typeof failure === 'object' && 'status' in failure ? failure.status : undefined;
        if (httpStatus !== 401 && httpStatus !== 403 && attempt < 2) {
          setStatus('waiting');
          timer = setTimeout(() => setAttempt(attempt + 1), 2000);
          return;
        }
        setStatus('error');
        setError(GENERIC_ERROR_MESSAGE);
      }
    }
    void exchange();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, getToken, attempt, retryCount]);

  const handleRetry = () => {
    setAttempt(0);
    setRetryCount((prev) => prev + 1);
  };

  const handleSignOut = async () => {
    clearBackendToken();
    await signOut();
    router.push('/sign-in');
  };

  // Status messages
  const statusConfig = {
    checking: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: 'Sprawdzam konto...',
      description: 'Weryfikuję konfigurację Twojego konta',
    },
    waiting: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: 'Finalizuję konfigurację...',
      description: 'To może potrwać kilka sekund',
    },
    success: {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: 'Konto skonfigurowane!',
      description: 'Za chwilę zostaniesz przekierowany...',
    },
    error: {
      icon: <AlertTriangle className="h-8 w-8 text-warning" />,
      title: 'Konfiguracja konta',
      description: error || 'Wystąpił problem podczas konfiguracji. Spróbuj ponownie.',
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-light">
            {currentStatus.icon}
          </div>
          <CardTitle className="text-2xl">{currentStatus.title}</CardTitle>
          <CardDescription>{currentStatus.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User info */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{organizationName}</p>
                <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </div>

          {/* Actions - show only on error */}
          {status === 'error' && (
            <div className="space-y-3">
              <Button data-testid="onboarding-retry-btn" onClick={handleRetry} className="w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Spróbuj ponownie
              </Button>

              <Button
                data-testid="onboarding-support-btn"
                variant="outline"
                onClick={() => window.open('mailto:kontakt@fiziyo.pl', '_blank')}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Kontakt z pomocą
              </Button>

              <Button data-testid="onboarding-sign-out-btn" variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Wyloguj się
              </Button>
            </div>
          )}

          {/* Progress indicator for loading states */}
          {(status === 'checking' || status === 'waiting') && (
            <div className="flex justify-center">
              <div className="flex gap-1">
                <div className={`h-2 w-2 rounded-full ${status === 'checking' ? 'bg-primary' : 'bg-border'}`} />
                <div className={`h-2 w-2 rounded-full ${status === 'waiting' ? 'bg-primary' : 'bg-border'}`} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
