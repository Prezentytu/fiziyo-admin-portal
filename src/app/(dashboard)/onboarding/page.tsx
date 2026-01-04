"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser, useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Building2,
  RefreshCw,
  LogOut,
  Mail,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearBackendToken } from "@/lib/tokenCache";

type OnboardingStatus =
  | "checking"
  | "creating"
  | "success"
  | "error"
  | "waiting";

/**
 * Strona onboardingu - automatycznie tworzy organizację dla nowego użytkownika
 * Używa metadanych z Clerk do utworzenia organizacji w backendzie
 */
export default function OnboardingPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<OnboardingStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const metadata = user?.unsafeMetadata as
    | {
        firstName?: string;
        lastName?: string;
        companyName?: string;
        organizationType?: string;
      }
    | undefined;

  const organizationName =
    metadata?.companyName ||
    `${metadata?.firstName || ""} ${
      metadata?.lastName || ""
    } - Fizjoterapia`.trim();

  /**
   * Tworzy organizację w backendzie używając GraphQL mutation
   * Używa bezpośredniego fetch z Clerk token
   */
  const createOrganization = useCallback(async (): Promise<boolean> => {
    try {
      const clerkToken = await getToken();
      if (!clerkToken) {
        throw new Error("Nie można pobrać tokenu autoryzacji");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error("Brak konfiguracji API");
      }

      const response = await fetch(`${apiUrl}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation CreateOrganization($name: String!, $description: String, $plan: SubscriptionPlan! = FREE) {
              createOrganization(name: $name, description: $description, plan: $plan) {
                id
                name
              }
            }
          `,
          variables: {
            name: organizationName,
            description: `Organizacja utworzona automatycznie dla ${
              metadata?.organizationType || "individual"
            }`,
            plan: "FREE",
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        // Sprawdź czy organizacja już istnieje (możliwe że webhook ją utworzył)
        const errorMessage = result.errors[0]?.message || "";
        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("already has")
        ) {
          console.log("[Onboarding] Organizacja już istnieje - kontynuuję...");
          return true;
        }
        throw new Error(errorMessage);
      }

      if (result.data?.createOrganization?.id) {
        console.log(
          "[Onboarding] Organizacja utworzona:",
          result.data.createOrganization.id
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error("[Onboarding] Błąd tworzenia organizacji:", err);
      throw err;
    }
  }, [getToken, organizationName, metadata?.organizationType]);

  /**
   * Sprawdza czy token exchange już działa (organizacja istnieje)
   */
  const checkTokenExchange = useCallback(async (): Promise<boolean> => {
    try {
      const clerkToken = await getToken();
      if (!clerkToken) return false;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return false;

      const response = await fetch(`${apiUrl}/api/token-exchange/clerk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: clerkToken }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [getToken]);

  /**
   * Główny flow onboardingu
   */
  const runOnboarding = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      // 1. Sprawdź czy token exchange już działa
      const tokenWorks = await checkTokenExchange();
      if (tokenWorks) {
        setStatus("success");
        clearBackendToken();
        setTimeout(() => {
          globalThis.location.href = "/";
        }, 1500);
        return;
      }

      // 2. Spróbuj utworzyć organizację
      setStatus("creating");
      await createOrganization();

      // 3. Poczekaj chwilę i sprawdź ponownie
      setStatus("waiting");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tokenWorksNow = await checkTokenExchange();
      if (tokenWorksNow) {
        setStatus("success");
        clearBackendToken();
        setTimeout(() => {
          globalThis.location.href = "/";
        }, 1500);
        return;
      }

      // 4. Jeśli nadal nie działa - czekaj dłużej (webhook może być wolny)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const finalCheck = await checkTokenExchange();
      if (finalCheck) {
        setStatus("success");
        clearBackendToken();
        setTimeout(() => {
          globalThis.location.href = "/";
        }, 1500);
        return;
      }

      // 5. Ostateczny błąd
      setStatus("error");
      setError("Konfiguracja konta trwa dłużej niż zwykle. Spróbuj ponownie.");
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas konfiguracji konta"
      );
    }
  }, [checkTokenExchange, createOrganization]);

  // Uruchom onboarding automatycznie przy pierwszym renderze
  useEffect(() => {
    if (user && retryCount === 0) {
      runOnboarding();
    }
  }, [user, retryCount, runOnboarding]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    runOnboarding();
  };

  const handleSignOut = async () => {
    clearBackendToken();
    await signOut();
    router.push("/login");
  };

  // Status messages
  const statusConfig = {
    checking: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: "Sprawdzam konto...",
      description: "Weryfikuję konfigurację Twojego konta",
    },
    creating: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: "Tworzę organizację...",
      description: "Konfiguruję Twoją przestrzeń roboczą",
    },
    waiting: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: "Finalizuję konfigurację...",
      description: "To może potrwać kilka sekund",
    },
    success: {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Konto skonfigurowane!",
      description: "Za chwilę zostaniesz przekierowany...",
    },
    error: {
      icon: <AlertTriangle className="h-8 w-8 text-warning" />,
      title: "Konfiguracja konta",
      description:
        error || "Wystąpił problem podczas konfiguracji. Spróbuj ponownie.",
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
                <p className="font-medium text-foreground">
                  {organizationName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Typ:{" "}
              <span className="text-foreground">
                {metadata?.organizationType === "individual" &&
                  "Praktyka Indywidualna"}
                {metadata?.organizationType === "small" && "Mały Gabinet"}
                {metadata?.organizationType === "large" && "Duża Klinika"}
                {!metadata?.organizationType && "Praktyka Indywidualna"}
              </span>
            </p>
          </div>

          {/* Actions - show only on error */}
          {status === "error" && (
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Spróbuj ponownie
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  window.open("mailto:support@fiziyo.pl", "_blank")
                }
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Kontakt z pomocą
              </Button>

              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Wyloguj się
              </Button>
            </div>
          )}

          {/* Progress indicator for loading states */}
          {(status === "checking" ||
            status === "creating" ||
            status === "waiting") && (
            <div className="flex justify-center">
              <div className="flex gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    status === "checking" ? "bg-primary" : "bg-border"
                  }`}
                />
                <div
                  className={`h-2 w-2 rounded-full ${
                    status === "creating" ? "bg-primary" : "bg-border"
                  }`}
                />
                <div
                  className={`h-2 w-2 rounded-full ${
                    status === "waiting" ? "bg-primary" : "bg-border"
                  }`}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}














