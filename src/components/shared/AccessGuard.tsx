"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { LoadingState } from "./LoadingState";

// ========================================
// Types
// ========================================

export type RequiredAccess = "admin" | "owner";

interface AccessGuardProps {
  readonly children: React.ReactNode;
  /** Required access level - "admin" means owner OR admin, "owner" means only owner */
  readonly requiredAccess?: RequiredAccess;
  /** URL to redirect to if access is denied (default: "/") */
  readonly fallbackUrl?: string;
  /** Whether to show access denied message instead of redirecting */
  readonly showAccessDenied?: boolean;
}

// ========================================
// Access Denied Component
// ========================================

function AccessDenied() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Brak dostępu</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nie masz uprawnień do wyświetlenia tej strony.
        </p>
        <p className="text-sm text-muted-foreground">
          Skontaktuj się z administratorem organizacji, aby uzyskać dostęp.
        </p>
      </div>
    </div>
  );
}

// ========================================
// Component
// ========================================

/**
 * AccessGuard - Protects pages based on user's role in the organization.
 *
 * @example
 * ```tsx
 * // Protect entire page - requires admin or owner role
 * <AccessGuard requiredAccess="admin">
 *   <BillingPage />
 * </AccessGuard>
 *
 * // Protect page - requires owner role only
 * <AccessGuard requiredAccess="owner">
 *   <DangerZone />
 * </AccessGuard>
 * ```
 */
export function AccessGuard({
  children,
  requiredAccess = "admin",
  fallbackUrl = "/",
  showAccessDenied = false,
}: AccessGuardProps) {
  const router = useRouter();
  const { isOwner, isLoading, canManageOrganization } = useRoleAccess();

  // Determine if user has required access
  const hasAccess = requiredAccess === "owner" ? isOwner : canManageOrganization;

  // Handle redirect when access is denied
  useEffect(() => {
    if (!isLoading && !hasAccess && !showAccessDenied) {
      router.replace(fallbackUrl);
    }
  }, [isLoading, hasAccess, showAccessDenied, router, fallbackUrl]);

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  // Show access denied message if configured
  if (!hasAccess && showAccessDenied) {
    return <AccessDenied />;
  }

  // Redirect is happening, show nothing
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
