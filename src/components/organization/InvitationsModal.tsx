"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Mail,
  Clock,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  Copy,
  MoreHorizontal,
  Link2,
  User,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GET_ORGANIZATION_INVITATIONS_QUERY,
} from "@/graphql/queries/organizations.queries";
import {
  RESEND_INVITATION_MUTATION,
  REVOKE_INVITATION_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import type {
  OrganizationInvitationsResponse,
  OrganizationInvitation,
} from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface InvitationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onInviteClick: () => void;
}

// ========================================
// Helpers
// ========================================

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  THERAPIST: "Fizjoterapeuta",
  MEMBER: "Członek",
  STAFF: "Personel",
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Oczekujące",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  accepted: {
    label: "Zaakceptowane",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: Check,
  },
  expired: {
    label: "Wygasłe",
    color: "bg-muted text-muted-foreground border-border",
    icon: AlertCircle,
  },
  revoked: {
    label: "Anulowane",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: X,
  },
};

function getInviteUrl(token: string): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.fizjo.pl";
  return `${baseUrl}/invite?token=${token}`;
}

// ========================================
// Component
// ========================================

export function InvitationsModal({
  open,
  onOpenChange,
  organizationId,
  onInviteClick,
}: InvitationsModalProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  // Fetch invitations
  const {
    data: invitationsData,
    loading: invitationsLoading,
    refetch: refetchInvitations,
  } = useQuery<OrganizationInvitationsResponse>(
    GET_ORGANIZATION_INVITATIONS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId || !open,
      fetchPolicy: "cache-and-network",
    }
  );

  // Mutations
  const [resendInvitation, { loading: resending }] = useMutation(
    RESEND_INVITATION_MUTATION,
    {
      onCompleted: () => {
        toast.success("Zaproszenie zostało wysłane ponownie");
        refetchInvitations();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const [revokeInvitation, { loading: revoking }] = useMutation(
    REVOKE_INVITATION_MUTATION,
    {
      onCompleted: () => {
        toast.success("Zaproszenie zostało anulowane");
        refetchInvitations();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const invitations = invitationsData?.organizationInvitations || [];

  // Filter invitations
  const pendingInvitations = invitations.filter((inv) => {
    return inv.status === "pending" && !isPast(new Date(inv.expiresAt));
  });

  const displayedInvitations = activeTab === "pending" ? pendingInvitations : invitations;

  // Handlers
  const handleCopyLink = async (invitation: OrganizationInvitation) => {
    if (!invitation.invitationToken) {
      toast.error("Brak tokenu zaproszenia");
      return;
    }
    const url = getInviteUrl(invitation.invitationToken);
    await navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  };

  const handleResend = async (invitationId: string) => {
    await resendInvitation({ variables: { invitationId } });
  };

  const handleRevoke = async (invitationId: string) => {
    await revokeInvitation({ variables: { invitationId } });
  };

  const handleNewInvite = () => {
    onOpenChange(false);
    onInviteClick();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-4.5 w-4.5 text-primary" />
              </div>
              <span>Zarządzaj zaproszeniami</span>
              {pendingInvitations.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                  {pendingInvitations.length} oczekuje
                </Badge>
              )}
            </DialogTitle>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleNewInvite}
              data-testid="invitations-modal-new-btn"
            >
              <UserPlus className="h-4 w-4" />
              Nowe zaproszenie
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col pt-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "all")} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="h-8">
                <TabsTrigger value="pending" className="text-xs h-7 px-3">
                  Oczekujące ({pendingInvitations.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs h-7 px-3">
                  Wszystkie ({invitations.length})
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchInvitations()}
                disabled={invitationsLoading}
                className="h-8"
                data-testid="invitations-modal-refresh-btn"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    invitationsLoading && "animate-spin"
                  )}
                />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {invitationsLoading && !invitationsData ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : displayedInvitations.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title={activeTab === "pending" ? "Brak oczekujących zaproszeń" : "Brak zaproszeń"}
                  description={
                    activeTab === "pending"
                      ? "Wszystkie zaproszenia zostały zaakceptowane"
                      : "Wyślij zaproszenie, aby dodać nową osobę do zespołu"
                  }
                  actionLabel="Wyślij zaproszenie"
                  onAction={handleNewInvite}
                />
              ) : (
                <div className="space-y-2">
                  {displayedInvitations.map((invitation) => (
                    <InvitationRow
                      key={invitation.id}
                      invitation={invitation}
                      onCopyLink={() => handleCopyLink(invitation)}
                      onResend={() => handleResend(invitation.id)}
                      onRevoke={() => handleRevoke(invitation.id)}
                      isLoading={resending || revoking}
                    />
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// Sub-components
// ========================================

interface InvitationRowProps {
  invitation: OrganizationInvitation;
  onCopyLink: () => void;
  onResend: () => void;
  onRevoke: () => void;
  isLoading?: boolean;
}

function InvitationRow({
  invitation,
  onCopyLink,
  onResend,
  onRevoke,
  isLoading,
}: InvitationRowProps) {
  const isExpired =
    invitation.status === "pending" && isPast(new Date(invitation.expiresAt));
  const effectiveStatus = isExpired ? "expired" : invitation.status;
  const config = statusConfig[effectiveStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  const isPending = effectiveStatus === "pending";
  const isLink = !invitation.email;

  return (
    <div
      className="group flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3 transition-all duration-200 hover:bg-surface-light hover:border-border"
      data-testid={`invitations-modal-row-${invitation.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Icon */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-light shrink-0">
          {isLink ? (
            <Link2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Mail className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">
              {isLink ? "Link zaproszenia" : invitation.email}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {roleLabels[invitation.role?.toUpperCase()] || invitation.role}
            </Badge>
            <Badge
              className={cn(
                "gap-1 text-[10px] px-1.5 py-0 border",
                config.color
              )}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>
              {format(new Date(invitation.createdAt), "d MMM yyyy", {
                locale: pl,
              })}
            </span>
            {isPending && (
              <>
                <span>•</span>
                <span className={isExpired ? "text-red-400" : ""}>
                  {isExpired
                    ? "wygasło"
                    : `wygasa ${formatDistanceToNow(new Date(invitation.expiresAt), { locale: pl, addSuffix: true })}`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isPending && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink();
            }}
            title="Kopiuj link"
            data-testid={`invitations-modal-copy-${invitation.id}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLoading}
              data-testid={`invitations-modal-menu-${invitation.id}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPending && (
              <>
                <DropdownMenuItem onClick={onCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiuj link
                </DropdownMenuItem>
                {!isLink && (
                  <DropdownMenuItem onClick={onResend}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Wyślij ponownie
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRevoke}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Anuluj zaproszenie
                </DropdownMenuItem>
              </>
            )}
            {effectiveStatus === "expired" && (
              <DropdownMenuItem onClick={onResend}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Wyślij ponownie
              </DropdownMenuItem>
            )}
            {effectiveStatus === "accepted" && (
              <DropdownMenuItem disabled>
                <User className="h-4 w-4 mr-2" />
                Użytkownik dołączył
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
