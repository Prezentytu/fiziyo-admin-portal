'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Mail,
  Clock,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WelcomeModal } from '@/components/organization/WelcomeModal';
import { useAcceptOrganizationInvitation } from '@/components/organization/useAcceptOrganizationInvitation';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { GET_INVITATION_BY_TOKEN_QUERY } from '@/graphql/queries/organizations.queries';
import type { OrganizationInvitation } from '@/types/apollo';
import { cn } from '@/lib/utils';
import { useAppSignOut } from '@/lib/auth/useAppSignOut';

// ========================================
// Types
// ========================================

interface GetInvitationByTokenResponse {
  invitationByToken: OrganizationInvitation | null;
}

// ========================================
// Main Component
// ========================================

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const signOut = useAppSignOut();
  const token = searchParams.get('token');

  const [acceptedInvitation, setAcceptedInvitation] = useState<OrganizationInvitation | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { status: joinStatus, join, retrySwitch } = useAcceptOrganizationInvitation();
  const isAccepting = joinStatus === 'accepting';

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

  const invitation = inviteData?.invitationByToken;
  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();
  const isValid = invitation && !isExpired && invitation.status === 'pending';

  // Check if user email matches invitation email (if invitation has email)
  const emailMismatch = isSignedIn && invitation?.email && user?.primaryEmailAddress?.emailAddress !== invitation.email;

  // Handle accept
  const handleAccept = () => {
    if (!token || !invitation || !isValid || !isSignedIn) return;
    setAcceptedInvitation(invitation);
    void join(token);
  };

  if (joinStatus === 'joined' && acceptedInvitation) {
    return (
      <WelcomeModal
        organizationName={acceptedInvitation.organization?.name || 'organizacji'}
        organizationLogo={acceptedInvitation.organization?.logoUrl}
        invitedByName={acceptedInvitation.invitedBy?.fullname}
        invitedByImage={acceptedInvitation.invitedBy?.image}
        role={acceptedInvitation.role}
        onClose={() => router.replace('/')}
      />
    );
  }

  if (joinStatus === 'switch-failed') {
    return (
      <InvalidState
        icon={AlertTriangle}
        title="Zaproszenie zostało przyjęte"
        description="Nie udało się przełączyć na nową organizację. Spróbuj ponownie."
        action={
          <Button onClick={retrySwitch} data-testid="org-invite-retry-switch-btn">
            Spróbuj ponownie
          </Button>
        }
      />
    );
  }

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
  if (joinStatus === 'switching' || validating || !userLoaded) {
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
              <p className="text-muted-foreground mt-4" role="status">
                {joinStatus === 'switching' ? 'Przełączanie organizacji…' : 'Weryfikacja zaproszenia...'}
              </p>
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
  if (invitation.status === 'accepted') {
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
  if (invitation.status === 'revoked') {
    return (
      <InvalidState
        icon={XCircle}
        title="Zaproszenie zostało anulowane"
        description="To zaproszenie zostało wycofane przez administratora organizacji."
      />
    );
  }

  // Not signed in - show login prompt
  if (!isSignedIn) {
    return (
      <PageWrapper>
        <Card
          className={cn(
            'w-full max-w-md border-border/60 transition-opacity duration-300 motion-reduce:transition-none',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <CardHeader className="text-center pb-4">
            <div
              className={cn(
                'mx-auto mb-4 transition-all duration-700 delay-200',
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              )}
            >
              {invitation.organization?.logoUrl ? (
                <Avatar className="h-20 w-20 ring-4 ring-border/30 shadow-xl">
                  <AvatarImage src={invitation.organization.logoUrl} alt={invitation.organization.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                    {invitation.organization.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/20">
                  <Building2 className="h-10 w-10 text-primary-foreground" />
                </div>
              )}
            </div>
            <CardTitle
              className={cn(
                'text-xl transition-all duration-500 delay-300',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              Zaproszenie do organizacji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={cn(
                'text-center transition-all duration-500 delay-400',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <p className="text-lg font-semibold text-foreground">{invitation.organization?.name}</p>
              <div className="text-sm text-muted-foreground mt-1">
                Zostałeś zaproszony do dołączenia jako{' '}
                <Badge variant="outline" className="ml-1 border-primary/30 text-primary">
                  {getRoleLabel(invitation.role)}
                </Badge>
              </div>
            </div>

            {invitation.message && (
              <div className="rounded-xl border border-border/60 bg-surface-light p-4 text-sm text-foreground">
                &ldquo;{invitation.message}&rdquo;
              </div>
            )}

            <div className="space-y-3">
              <Button asChild className="w-full px-3 text-center sm:px-6" size="lg">
                <Link href={`/sign-in?redirect_url=/invite?token=${token}`}>
                  <Mail className="h-4 w-4" />
                  <span className="whitespace-normal">Zaloguj się aby dołączyć</span>
                </Link>
              </Button>
              <p className="text-center text-sm text-foreground">
                Nie masz konta?{' '}
                <Link
                  href={`/register?redirect_url=/invite?token=${token}`}
                  className="font-semibold text-tint underline underline-offset-4"
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
            'w-full max-w-md border-status-warning/30 backdrop-blur-sm bg-surface/95',
            'transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          )}
        >
          <CardHeader className="text-center pb-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full bg-status-warning-muted mx-auto mb-4',
                'transition-all duration-500 delay-200',
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              )}
            >
              <AlertTriangle className="h-8 w-8 text-status-warning" />
            </div>
            <CardTitle className="text-xl">Niezgodność adresu email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                To zaproszenie zostało wysłane na adres{' '}
                <span className="font-medium text-foreground">{invitation.email}</span>
              </p>
              <p className="mt-2">
                Jesteś zalogowany jako{' '}
                <span className="font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => signOut(`/invite?token=${encodeURIComponent(token ?? '')}`)}
                variant="outline"
                className="w-full gap-2"
              >
                Zaloguj się na właściwe konto
              </Button>
              <Button onClick={handleAccept} className="w-full gap-2" disabled={isAccepting}>
                {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
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
          'w-full max-w-md overflow-hidden border-primary/30 shadow-2xl shadow-primary/10',
          'transition-opacity duration-300 motion-reduce:transition-none',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Gradient accent top */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary to-primary" />

        <CardHeader className="text-center pb-4 pt-6">
          <div
            className={cn(
              'mx-auto mb-4 relative transition-all duration-700 delay-200',
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
          >
            {/* Decorative ring */}
            <div className="absolute inset-0 -m-2 rounded-full border-2 border-primary/20 animate-pulse" />

            {invitation.organization?.logoUrl ? (
              <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-xl">
                <AvatarImage src={invitation.organization.logoUrl} alt={invitation.organization.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                  {invitation.organization.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30">
                <Building2 className="h-12 w-12 text-primary-foreground" />
              </div>
            )}

            {/* Sparkle decorations */}
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-pulse" />
          </div>

          <CardTitle
            className={cn(
              'text-2xl transition-all duration-500 delay-300',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            Dołącz do organizacji
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div
            className={cn(
              'text-center transition-all duration-500 delay-400',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <p className="text-xl font-semibold text-foreground">{invitation.organization?.name}</p>
            <div className="text-sm text-muted-foreground mt-2">
              Zostałeś zaproszony jako{' '}
              <Badge variant="outline" className="ml-1 border-primary/30 text-primary font-medium">
                {getRoleLabel(invitation.role)}
              </Badge>
            </div>
          </div>

          {invitation.invitedBy && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl bg-surface-light p-4 border border-border/60',
                'transition-all duration-500 delay-500',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage src={invitation.invitedBy.image ?? undefined} alt={invitation.invitedBy.fullname} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {invitation.invitedBy.fullname?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{invitation.invitedBy.fullname}</p>
                <p className="text-xs text-muted-foreground">zaprosił(a) Cię do zespołu</p>
              </div>
            </div>
          )}

          {invitation.message && (
            <div className="rounded-xl border border-border/60 bg-surface-light p-4 text-sm text-foreground">
              &ldquo;{invitation.message}&rdquo;
            </div>
          )}

          <Button onClick={handleAccept} className="w-full px-3 sm:px-6" size="lg" disabled={isAccepting}>
            {isAccepting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <UserPlus />
                <span className="whitespace-normal">Dołącz do organizacji</span>
              </>
            )}
          </Button>
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
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-primary/5 rounded-full blur-3xl" />
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

function InvalidState({ icon: Icon, title, description, action }: InvalidStateProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageWrapper>
      <Card
        className={cn(
          'w-full max-w-md border-border/60 backdrop-blur-sm bg-surface/95',
          'transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-6',
              'transition-all duration-500 delay-200',
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
          >
            <Icon className="h-8 w-8 text-destructive" />
          </div>
          <h1
            className={cn(
              'text-xl font-bold text-foreground mb-2 transition-all duration-500 delay-300',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              'text-muted-foreground text-center mb-6 transition-all duration-500 delay-400',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            {description}
          </p>
          <div
            className={cn(
              'transition-all duration-500 delay-500',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
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
    OWNER: 'Właściciel',
    ADMIN: 'Administrator',
    THERAPIST: 'Fizjoterapeuta',
    STAFF: 'Personel',
  };
  return labels[role?.toUpperCase()] || role;
}

// ========================================
// Export with Suspense
// ========================================

export default function InvitePage() {
  const { isSignedIn } = useAuth();
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
      <OrganizationProvider skipOrganizationsQuery={!isSignedIn}>
        <InvitePageContent />
      </OrganizationProvider>
    </Suspense>
  );
}
