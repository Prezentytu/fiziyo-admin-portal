"use client";

import { useState, useEffect, useCallback } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { GET_INVITATION_BY_TOKEN_QUERY } from "@/graphql/queries/organizations.queries";
import { ACCEPT_INVITATION_MUTATION } from "@/graphql/mutations/organizations.mutations";
import type { OrganizationInvitation } from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface JoinOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface GetInvitationByTokenResponse {
  invitationByToken: OrganizationInvitation | null;
}

type ValidationState =
  | "idle"
  | "validating"
  | "valid"
  | "expired"
  | "not_found"
  | "already_used"
  | "revoked";

// ========================================
// Helpers
// ========================================

function extractToken(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Try parsing as URL
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token");
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
    OWNER: "Właściciel",
    ADMIN: "Administrator",
    THERAPIST: "Fizjoterapeuta",
    MEMBER: "Członek",
    STAFF: "Personel",
  };
  return labels[role?.toUpperCase()] || role;
}

// ========================================
// Component
// ========================================

export function JoinOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: JoinOrganizationDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [isAccepting, setIsAccepting] = useState(false);

  // Query for validating token
  const [validateToken, { data: inviteData, loading: validating }] =
    useLazyQuery<GetInvitationByTokenResponse>(GET_INVITATION_BY_TOKEN_QUERY, {
      fetchPolicy: "network-only",
    });

  // Accept mutation
  const [acceptInvitation] = useMutation(ACCEPT_INVITATION_MUTATION, {
    refetchQueries: [
      "GetUserOrganizations",
      "GetOrganizationInvitations",
      "GetOrganizationInvitationStats",
    ],
    awaitRefetchQueries: false,
  });

  const invitation = inviteData?.invitationByToken;

  // Debounced validation
  useEffect(() => {
    const token = extractToken(inputValue);

    if (!token) {
      setValidationState("idle");
      return;
    }

    setValidationState("validating");

    const timeoutId = setTimeout(() => {
      validateToken({ variables: { token } });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputValue, validateToken]);

  // Update validation state based on query result
  useEffect(() => {
    if (validating) {
      setValidationState("validating");
      return;
    }

    const token = extractToken(inputValue);
    if (!token) {
      setValidationState("idle");
      return;
    }

    if (!invitation) {
      setValidationState("not_found");
      return;
    }

    const isExpired = new Date(invitation.expiresAt) < new Date();

    if (isExpired) {
      setValidationState("expired");
    } else if (invitation.status === "accepted") {
      setValidationState("already_used");
    } else if (invitation.status === "revoked") {
      setValidationState("revoked");
    } else if (invitation.status === "pending") {
      setValidationState("valid");
    } else {
      setValidationState("not_found");
    }
  }, [invitation, validating, inputValue]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setValidationState("idle");
      setIsAccepting(false);
    }
  }, [open]);

  // Handle accept
  const handleAccept = useCallback(async () => {
    const token = extractToken(inputValue);
    if (!token || validationState !== "valid") return;

    setIsAccepting(true);

    try {
      await acceptInvitation({
        variables: { invitationToken: token },
      });

      toast.success("Dołączyłeś do organizacji!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Nieznany błąd";
      toast.error(`Błąd: ${errorMessage}`);
      setIsAccepting(false);
    }
  }, [inputValue, validationState, acceptInvitation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Dołącz do organizacji
          </DialogTitle>
          <DialogDescription>
            Wklej link zaproszenia otrzymany od właściciela gabinetu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://app.fiziyo.pl/invite?token=..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-9 pr-10"
                autoFocus
              />
              {validationState === "validating" && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
              {validationState === "valid" && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              )}
              {(validationState === "expired" ||
                validationState === "not_found" ||
                validationState === "already_used" ||
                validationState === "revoked") && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Możesz wkleić pełny link lub sam token zaproszenia
            </p>
          </div>

          {/* Validation states */}
          {validationState === "expired" && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie wygasło</p>
                  <p className="text-sm text-muted-foreground">
                    Poproś o nowy link zaproszenia
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {validationState === "not_found" && inputValue.trim() && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Nie znaleziono zaproszenia</p>
                  <p className="text-sm text-muted-foreground">
                    Sprawdź poprawność linku lub tokena
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {validationState === "already_used" && (
            <Card className="border-border/60 bg-surface-light">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie już wykorzystane</p>
                  <p className="text-sm text-muted-foreground">
                    To zaproszenie zostało już zaakceptowane
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {validationState === "revoked" && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Zaproszenie anulowane</p>
                  <p className="text-sm text-muted-foreground">
                    To zaproszenie zostało wycofane przez administratora
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid invitation preview */}
          {validationState === "valid" && invitation && (
            <Card className="border-primary/30 bg-primary/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
              <CardContent className="p-4 space-y-4">
                {/* Organization info */}
                <div className="flex items-center gap-4">
                  {invitation.organization?.logoUrl ? (
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                      <AvatarImage
                        src={invitation.organization.logoUrl}
                        alt={invitation.organization.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-bold">
                        {invitation.organization.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg text-foreground truncate">
                      {invitation.organization?.name || "Organizacja"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
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
                      <AvatarImage
                        src={invitation.invitedBy.image ?? undefined}
                        alt={invitation.invitedBy.fullname}
                      />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                        {invitation.invitedBy.fullname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {invitation.invitedBy.fullname}
                      </p>
                      <p className="text-xs text-muted-foreground">zaprosił(a) Cię</p>
                    </div>
                  </div>
                )}

                {/* Message */}
                {invitation.message && (
                  <div className="rounded-lg bg-surface p-3 border border-border/60">
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{invitation.message}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAccepting}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleAccept}
              disabled={validationState !== "valid" || isAccepting}
              className={cn(
                "gap-2",
                validationState === "valid" &&
                  "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary-dark hover:to-emerald-700"
              )}
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Dołącz do organizacji
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

