"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Mail,
  Clock,
  ArrowRight,
  UserPlus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WelcomeModal } from "@/components/organization/WelcomeModal";
import { ACCEPT_INVITATION_MUTATION } from "@/graphql/mutations/organizations.mutations";
import { GET_INVITATION_BY_TOKEN_QUERY } from "@/graphql/queries/organizations.queries";
import type { OrganizationInvitation } from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface GetInvitationByTokenResponse {
  invitationByToken: OrganizationInvitation | null;
}

interface AcceptInvitationResponse {
  acceptInvitation: {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
  };
}

// ========================================
// Main Component
// ========================================

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const token = searchParams.get("token");

  const [isAccepting, setIsAccepting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Validate invitation
  const {
    data: inviteData,
    loading: validating,
    error: validateError,
  } = useQuery<GetInvitationByTokenResponse>(GET_INVITATION_BY_TOKEN_QUERY, {
    variables: { token },
    skip: !token,
  });

  // Accept mutation
  const [acceptInvitation] = useMutation<AcceptInvitationResponse>(
    ACCEPT_INVITATION_MUTATION
  );

  const invitation = inviteData?.invitationByToken;
  const isExpired =
    invitation && new Date(invitation.expiresAt) < new Date();
  const isValid =
    invitation && !isExpired && invitation.status === "pending";

  // Check if user email matches invitation email (if invitation has email)
  const emailMismatch =
    isSignedIn &&
    invitation?.email &&
    user?.primaryEmailAddress?.emailAddress !== invitation.email;

  // Handle accept
  const handleAccept = async () => {
    if (!token || !isValid) return;

    setIsAccepting(true);

    try {
      await acceptInvitation({
        variables: { invitationToken: token },
      });

      // Show welcome modal instead of simple redirect
      setShowWelcome(true);
      toast.success("Dołączyłeś do organizacji!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Nieznany błąd";
      toast.error(`Błąd: ${errorMessage}`);
      setIsAccepting(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <InvalidState
        icon={AlertTriangle}
        title="Brak tokenu zaproszenia"
        description="Link zaproszenia jest nieprawidłowy lub uszkodzony."
      />
    );
  }

  // Loading state
  if (validating || !userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          </div>

          <Card className="w-full max-w-md border-border/60 backdrop-blur-sm bg-surface/80">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="absolute inset-0 h-12 w-12 border-2 border-primary/20 rounded-full animate-ping" />
              </div>
              <p className="text-muted-foreground mt-4">Weryfikacja zaproszenia...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error or not found
  if (validateError || !invitation) {
    return (
      <InvalidState
        icon={XCircle}
        title="Zaproszenie nie istnieje"
        description="To zaproszenie zostało usunięte lub nigdy nie istniało."
      />
    );
  }

  // Expired
  if (isExpired) {
    return (
      <InvalidState
        icon={Clock}
        title="Zaproszenie wygasło"
        description="To zaproszenie jest już nieważne. Poproś osobę, która Cię zaprosiła, o wysłanie nowego zaproszenia."
      />
    );
  }

  // Already accepted
  if (invitation.status === "accepted") {
    return (
      <InvalidState
        icon={CheckCircle}
        title="Zaproszenie zostało już zaakceptowane"
        description="To zaproszenie zostało już wykorzystane."
        action={
          <Button asChild>
            <Link href="/">Przejdź do aplikacji</Link>
          </Button>
        }
      />
    );
  }

  // Revoked
  if (invitation.status === "revoked") {
    return (
      <InvalidState
        icon={XCircle}
        title="Zaproszenie zostało anulowane"
        description="To zaproszenie zostało wycofane przez administratora organizacji."
      />
    );
  }

  // Show Welcome Modal after successful accept
  if (showWelcome) {
    return (
      <WelcomeModal
        organizationName={invitation.organization?.name || "organizacji"}
        organizationLogo={invitation.organization?.logoUrl}
        invitedByName={invitation.invitedBy?.fullname}
        invitedByImage={invitation.invitedBy?.image}
        role={invitation.role}
        onClose={() => router.push("/")}
      />
    );
  }

  // Not signed in - show login prompt
  if (!isSignedIn) {
    return (
      <PageWrapper>
        <Card
          className={cn(
            "w-full max-w-md border-border/60 backdrop-blur-sm bg-surface/95",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
          )}
        >
          <CardHeader className="text-center pb-4">
            <div
              className={cn(
                "mx-auto mb-4 transition-all duration-700 delay-200",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
            >
              {invitation.organization?.logoUrl ? (
                <Avatar className="h-20 w-20 ring-4 ring-border/30 shadow-xl">
                  <AvatarImage
                    src={invitation.organization.logoUrl}
                    alt={invitation.organization.name}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                    {invitation.organization.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/20">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <CardTitle
              className={cn(
                "text-xl transition-all duration-500 delay-300",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              Zaproszenie do organizacji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={cn(
                "text-center transition-all duration-500 delay-400",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <p className="text-lg font-semibold text-foreground">
                {invitation.organization?.name}
              </p>
              <div className="text-sm text-muted-foreground mt-1">
                Zostałeś zaproszony do dołączenia jako{" "}
                <Badge variant="outline" className="ml-1 border-primary/30 text-primary">
                  {getRoleLabel(invitation.role)}
                </Badge>
              </div>
            </div>

            {invitation.message && (
              <div
                className={cn(
                  "rounded-xl bg-surface-light p-4 text-sm text-muted-foreground italic border border-border/60",
                  "transition-all duration-500 delay-500",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                &ldquo;{invitation.message}&rdquo;
              </div>
            )}

            <div
              className={cn(
                "space-y-3 transition-all duration-500 delay-600",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <Button asChild className="w-full gap-2" size="lg">
                <Link href={`/sign-in?redirect_url=/invite?token=${token}`}>
                  <Mail className="h-4 w-4" />
                  Zaloguj się aby dołączyć
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Nie masz konta?{" "}
                <Link
                  href={`/register?redirect_url=/invite?token=${token}`}
                  className="text-primary hover:underline font-medium"
                >
                  Zarejestruj się
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  // Email mismatch warning
  if (emailMismatch) {
    return (
      <PageWrapper>
        <Card
          className={cn(
            "w-full max-w-md border-amber-500/30 backdrop-blur-sm bg-surface/95",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
          )}
        >
          <CardHeader className="text-center pb-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 mx-auto mb-4",
                "transition-all duration-500 delay-200",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
            >
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Niezgodność adresu email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                To zaproszenie zostało wysłane na adres{" "}
                <span className="font-medium text-foreground">
                  {invitation.email}
                </span>
              </p>
              <p className="mt-2">
                Jesteś zalogowany jako{" "}
                <span className="font-medium text-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() =>
                  signOut({ redirectUrl: `/invite?token=${token}` })
                }
                variant="outline"
                className="w-full gap-2"
              >
                Zaloguj się na właściwe konto
              </Button>
              <Button
                onClick={handleAccept}
                className="w-full gap-2"
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Dołącz mimo to
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  // Valid invitation - show accept form
  return (
    <PageWrapper>
      <Card
        className={cn(
          "w-full max-w-md border-primary/30 shadow-2xl shadow-primary/10 backdrop-blur-sm bg-surface/95 overflow-hidden",
          "transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
        )}
      >
        {/* Gradient accent top */}
        <div className="h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />

        <CardHeader className="text-center pb-4 pt-6">
          <div
            className={cn(
              "mx-auto mb-4 relative transition-all duration-700 delay-200",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )}
          >
            {/* Decorative ring */}
            <div className="absolute inset-0 -m-2 rounded-full border-2 border-primary/20 animate-pulse" />

            {invitation.organization?.logoUrl ? (
              <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-xl">
                <AvatarImage
                  src={invitation.organization.logoUrl}
                  alt={invitation.organization.name}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                  {invitation.organization.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30">
                <Building2 className="h-12 w-12 text-white" />
              </div>
            )}

            {/* Sparkle decorations */}
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-pulse" />
          </div>

          <CardTitle
            className={cn(
              "text-2xl transition-all duration-500 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Dołącz do organizacji
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div
            className={cn(
              "text-center transition-all duration-500 delay-400",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <p className="text-xl font-semibold text-foreground">
              {invitation.organization?.name}
            </p>
            <div className="text-sm text-muted-foreground mt-2">
              Zostałeś zaproszony jako{" "}
              <Badge variant="outline" className="ml-1 border-primary/30 text-primary font-medium">
                {getRoleLabel(invitation.role)}
              </Badge>
            </div>
          </div>

          {invitation.invitedBy && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl bg-surface-light p-4 border border-border/60",
                "transition-all duration-500 delay-500",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage
                  src={invitation.invitedBy.image ?? undefined}
                  alt={invitation.invitedBy.fullname}
                />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {invitation.invitedBy.fullname?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {invitation.invitedBy.fullname}
                </p>
                <p className="text-xs text-muted-foreground">
                  zaprosił(a) Cię do zespołu
                </p>
              </div>
            </div>
          )}

          {invitation.message && (
            <div
              className={cn(
                "rounded-xl bg-surface-light p-4 text-sm text-muted-foreground italic border border-border/60",
                "transition-all duration-500 delay-600",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              &ldquo;{invitation.message}&rdquo;
            </div>
          )}

          <div
            className={cn(
              "transition-all duration-500 delay-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Button
              onClick={handleAccept}
              className={cn(
                "w-full gap-2 h-12 text-base font-semibold",
                "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary-dark hover:to-emerald-700",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                "transition-all duration-300 hover:scale-[1.02]",
                !isAccepting && "animate-pulse"
              )}
              size="lg"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Dołącz do organizacji
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

// ========================================
// Helper Components
// ========================================

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {children}
    </div>
  );
}

interface InvalidStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function InvalidState({
  icon: Icon,
  title,
  description,
  action,
}: InvalidStateProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageWrapper>
      <Card
        className={cn(
          "w-full max-w-md border-border/60 backdrop-blur-sm bg-surface/95",
          "transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-6",
              "transition-all duration-500 delay-200",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )}
          >
            <Icon className="h-8 w-8 text-destructive" />
          </div>
          <h1
            className={cn(
              "text-xl font-bold text-foreground mb-2 transition-all duration-500 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "text-muted-foreground text-center mb-6 transition-all duration-500 delay-400",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {description}
          </p>
          <div
            className={cn(
              "transition-all duration-500 delay-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {action || (
              <Button asChild variant="outline">
                <Link href="/">Wróć do strony głównej</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: "Właściciel",
    ADMIN: "Administrator",
    THERAPIST: "Fizjoterapeuta",
    MEMBER: "Członek",
    STAFF: "Personel",
  };
  return labels[role?.toUpperCase()] || role;
}

// ========================================
// Export with Suspense
// ========================================

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="absolute inset-0 h-12 w-12 border-2 border-primary/20 rounded-full animate-ping" />
          </div>
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}
