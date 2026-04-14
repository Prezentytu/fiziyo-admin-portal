'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { getBackendToken, clearBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';
import { DashboardRouteLoading } from '@/components/layout/DashboardRouteLoading';

interface OrganizationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component sprawdzający czy użytkownik ma organizację w backendzie.
 * Jeśli token exchange zwróci błąd o braku organizacji, przekieruje na /onboarding.
 * Zawsze renderuje widoczny fallback (nigdy null), żeby uniknąć pustego ekranu.
 */
export function OrganizationGuard({ children }: Readonly<OrganizationGuardProps>) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  const getErrorStatusCode = (error: unknown): number | null => {
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
  };

  const getUserRoleFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const roleClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (typeof roleClaim === 'string') {
        return roleClaim;
      }

      if (typeof payload.role === 'string') {
        return payload.role;
      }
    } catch {
      return null;
    }

    return null;
  };

  useEffect(() => {
    async function checkOrganization() {
      // Pomiń sprawdzanie na stronie onboardingu
      if (pathname === '/onboarding') {
        setIsChecking(false);
        setHasOrganization(true);
        return;
      }

      if (!isLoaded || !isSignedIn) {
        setIsChecking(false);
        return;
      }

      try {
        // Sprawdź czy mamy cached token
        const cachedToken = getBackendToken();
        if (cachedToken) {
          setHasOrganization(true);
          setIsChecking(false);
          return;
        }

        // Spróbuj wymienić token
        const clerkToken = await getToken();
        if (!clerkToken) {
          setIsChecking(false);
          return;
        }

        const exchangedToken = await tokenExchangeService.exchangeClerkToken(clerkToken);
        const userRole = getUserRoleFromToken(exchangedToken.access_token);

        if (userRole === 'patient') {
          setHasOrganization(true);
          return;
        }

        setHasOrganization(true);
      } catch (error) {
        console.error('[OrganizationGuard] Token exchange error:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = getErrorStatusCode(error);

        if (statusCode === 404) {
          router.replace('/finalizing');
          return;
        }

        // Jeśli błąd dotyczy braku organizacji - przekieruj na onboarding
        if (
          errorMessage.includes('does not belong to') ||
          errorMessage.includes('organization') ||
          statusCode === 401 ||
          errorMessage.includes('401')
        ) {
          clearBackendToken();
          setHasOrganization(false);
          router.replace('/onboarding');
          return;
        }

        // Inne błędy - pozwól kontynuować (może być tymczasowy problem)
        setHasOrganization(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkOrganization();
  }, [isLoaded, isSignedIn, getToken, router, pathname]);

  // Loading state – spójny skeleton zamiast surowego spinnera
  if (isChecking) {
    return (
      <div className="min-h-screen w-full bg-background" data-testid="organization-guard-loading">
        <div className="p-4 lg:p-6">
          <DashboardRouteLoading />
        </div>
      </div>
    );
  }

  // Redirect w toku (hasOrganization === false) – pokazuj fallback zamiast null
  if (hasOrganization === false && pathname !== '/onboarding') {
    return (
      <div className="min-h-screen w-full bg-background" data-testid="organization-guard-redirecting">
        <div className="p-4 lg:p-6">
          <DashboardRouteLoading />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
