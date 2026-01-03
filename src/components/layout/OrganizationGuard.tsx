"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { getBackendToken, clearBackendToken } from "@/lib/tokenCache";
import { tokenExchangeService } from "@/services/tokenExchangeService";

interface OrganizationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component sprawdzający czy użytkownik ma organizację w backendzie.
 * Jeśli token exchange zwróci błąd o braku organizacji, przekieruje na /onboarding.
 */
export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOrganization() {
      // Pomiń sprawdzanie na stronie onboardingu
      if (pathname === "/onboarding") {
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

        await tokenExchangeService.exchangeClerkToken(clerkToken);
        setHasOrganization(true);
      } catch (error) {
        console.error("[OrganizationGuard] Token exchange error:", error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Jeśli błąd dotyczy braku organizacji - przekieruj na onboarding
        if (
          errorMessage.includes("does not belong to") ||
          errorMessage.includes("organization") ||
          errorMessage.includes("401")
        ) {
          clearBackendToken();
          setHasOrganization(false);
          router.replace("/onboarding");
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

  // Loading state
  if (isChecking) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Jeśli nie ma organizacji i nie jesteśmy na onboardingu - nie renderuj
  if (hasOrganization === false && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}












