'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Building2,
  Loader2,
  Link2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { GET_INVITATION_BY_TOKEN_QUERY } from '@/graphql/queries/organizations.queries';
import { useAcceptOrganizationInvitation } from '@/components/organization/useAcceptOrganizationInvitation';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationInvitation } from '@/types/apollo';
import { cn } from '@/lib/utils';

// ========================================
// Types
// ========================================

interface JoinOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GetInvitationByTokenResponse {
  invitationByToken: OrganizationInvitation | null;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'expired' | 'not_found' | 'already_used' | 'revoked';

// ========================================
// Helpers
// ========================================

function extractToken(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Try parsing as URL
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token');
  } catch {
    // Not a URL - treat as raw token
    // Validation: token should be at least 20 chars, alphanumeric with dashes/underscores
    if (trimmed.length >= 20 && /^[a-zA-Z0-9-_]+$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  }
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
// Component
// ========================================

export function JoinOrganizationDialog({ open, onOpenChange }: JoinOrganizationDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [submittedToken, setSubmittedToken] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const { refreshOrganizations } = useOrganization();
  const { status: joinStatus, join, retrySwitch, reset } = useAcceptOrganizationInvitation(() => onOpenChange(false));
  const isBusy = joinStatus === 'accepting' || joinStatus === 'switching';
  const switchFailed = joinStatus === 'switch-failed';
  const visibleValidation = joinStatus === 'idle' || joinStatus === 'accepting' ? validationState : 'idle';

  const { data: inviteData, loading: validating } = useQuery<GetInvitationByTokenResponse>(
    GET_INVITATION_BY_TOKEN_QUERY,
    {
      variables: { token: submittedToken },
      skip: !open || !submittedToken,
      fetchPolicy: 'network-only',
    }
  );

  const invitation = inviteData?.invitationByToken;

  // Debounced validation
  useEffect(() => {
    const token = extractToken(inputValue);

    if (!token) {
      setSubmittedToken('');
      setValidationState('idle');
      return;
    }

    setValidationState('validating');

    const timeoutId = setTimeout(() => {
      setSubmittedToken(token);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Update validation state based on query result
  useEffect(() => {
    const token = extractToken(inputValue);
    if (!token) {
      setValidationState('idle');
      return;
    }

    if (submittedToken !== token || validating) {
      setValidationState('validating');
      return;
    }

    if (!invitation) {
      setValidationState('not_found');
      return;
    }

    const isExpired = new Date(invitation.expiresAt) < new Date();

    if (isExpired) {
      setValidationState('expired');
    } else if (invitation.status === 'accepted') {
      setValidationState('already_used');
    } else if (invitation.status === 'revoked') {
      setValidationState('revoked');
    } else if (invitation.status === 'pending') {
      setValidationState('valid');
    } else {
      setValidationState('not_found');
    }
  }, [invitation, validating, inputValue, submittedToken]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setSubmittedToken('');
      setValidationState('idle');
      reset();
    }
  }, [open, reset]);

  const handleAccept = () => {
    const token = extractToken(inputValue);
    if (!token || visibleValidation !== 'valid') return;
    void join(token);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy) return;
    onOpenChange(nextOpen);
    if (!nextOpen && switchFailed) refreshOrganizations();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] grid-cols-1 sm:max-w-md" data-testid="settings-join-org-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Dołącz do organizacji
          </DialogTitle>
          <DialogDescription>Wklej link zaproszenia otrzymany od właściciela gabinetu</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="settings-join-org-token-input"
                aria-label="Wklej link zaproszenia"
                placeholder="https://portal.fiziyo.pl/invite?token=..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-9 pr-10"
                autoComplete="off"
                readOnly={joinStatus !== 'idle'}
                autoFocus
              />
              {visibleValidation === 'validating' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
              {visibleValidation === 'valid' && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              )}
              {(visibleValidation === 'expired' ||
                visibleValidation === 'not_found' ||
                visibleValidation === 'already_used' ||
                visibleValidation === 'revoked') && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Możesz wkleić pełny link lub sam token zaproszenia</p>
          </div>

          {/* Validation states */}
          {visibleValidation === 'expired' && (
            <Card className="border-status-warning/30 bg-status-warning-muted">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-warning-muted">
                  <Clock className="h-5 w-5 text-status-warning" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie wygasło</p>
                  <p className="text-sm text-muted-foreground">Poproś o nowy link zaproszenia</p>
                </div>
              </CardContent>
            </Card>
          )}

          {visibleValidation === 'not_found' && inputValue.trim() && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Nie znaleziono zaproszenia</p>
                  <p className="text-sm text-muted-foreground">Sprawdź poprawność linku lub tokena</p>
                </div>
              </CardContent>
            </Card>
          )}

          {visibleValidation === 'already_used' && (
            <Card className="border-border/60 bg-surface-light">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie już wykorzystane</p>
                  <p className="text-sm text-muted-foreground">To zaproszenie zostało już zaakceptowane</p>
                </div>
              </CardContent>
            </Card>
          )}

          {visibleValidation === 'revoked' && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie anulowane</p>
                  <p className="text-sm text-muted-foreground">To zaproszenie zostało wycofane przez administratora</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid invitation preview */}
          {visibleValidation === 'valid' && invitation && (
            <Card className="border-primary/30 bg-primary/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-primary to-primary" />
              <CardContent className="p-4 space-y-4">
                {/* Organization info */}
                <div className="flex items-center gap-4">
                  {invitation.organization?.logoUrl ? (
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                      <AvatarImage src={invitation.organization.logoUrl} alt={invitation.organization.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-bold">
                        {invitation.organization.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                      <Building2 className="h-7 w-7 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg text-foreground truncate">
                      {invitation.organization?.name || 'Organizacja'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm text-muted-foreground">Dołączysz jako:</span>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {getRoleLabel(invitation.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Invited by */}
                {invitation.invitedBy && (
                  <div className="flex items-center gap-3 rounded-lg bg-surface p-3 border border-border/60">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={invitation.invitedBy.image ?? undefined} alt={invitation.invitedBy.fullname} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                        {invitation.invitedBy.fullname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{invitation.invitedBy.fullname}</p>
                      <p className="text-xs text-muted-foreground">zaprosił(a) Cię</p>
                    </div>
                  </div>
                )}

                {/* Message */}
                {invitation.message && (
                  <div className="rounded-lg bg-surface p-3 border border-border/60">
                    <p className="text-sm text-muted-foreground italic">&ldquo;{invitation.message}&rdquo;</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {switchFailed && (
            <p role="alert" className="text-sm text-muted-foreground">
              Zaproszenie zostało przyjęte. Nie udało się przełączyć na nową organizację.
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button
              data-testid="settings-join-org-cancel-btn"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              Anuluj
            </Button>
            <Button
              onClick={switchFailed ? retrySwitch : handleAccept}
              disabled={(!switchFailed && visibleValidation !== 'valid') || isBusy}
              className={cn(
                'gap-2',
                visibleValidation === 'valid' &&
                  'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-accent-green'
              )}
              data-testid="settings-join-org-submit-btn"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {joinStatus === 'switching' ? 'Przełączanie…' : 'Dołączanie…'}
                </>
              ) : switchFailed ? (
                'Spróbuj ponownie'
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Dołącz do organizacji
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
