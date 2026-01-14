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

interface InvitationsSectionProps {
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

export function InvitationsSection({
  organizationId,
  onInviteClick,
}: InvitationsSectionProps) {
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
      skip: !organizationId,
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

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Zaproszenia</h3>
            <p className="text-sm text-muted-foreground">
              Zarządzaj dostępem do swojej organizacji
            </p>
          </div>
        </div>
        <Button onClick={onInviteClick} className="gap-2 shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" />
          Zaproś
        </Button>
      </div>

      <div className="space-y-4">
        {/* Tabs & Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 p-1 rounded-xl bg-accent/30 border border-border/40">
            <button
              onClick={() => setActiveTab("pending")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                activeTab === "pending"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Oczekujące ({pendingInvitations.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Wszystkie ({invitations.length})
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchInvitations()}
            disabled={invitationsLoading}
            className="h-9 w-9 rounded-xl hover:bg-accent/50"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-muted-foreground",
                invitationsLoading && "animate-spin"
              )}
            />
          </Button>
        </div>

        {/* List area */}
        <div>
          {invitationsLoading && !invitationsData ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
              onAction={onInviteClick}
            />
          ) : (
            <div className="space-y-3">
              {displayedInvitations.map((invitation) => (
                <InvitationItem
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
      </div>
    </div>
  );
}

// ========================================
// Sub-components
// ========================================

interface InvitationItemProps {
  invitation: OrganizationInvitation;
  onCopyLink: () => void;
  onResend: () => void;
  onRevoke: () => void;
  isLoading?: boolean;
}

function InvitationItem({
  invitation,
  onCopyLink,
  onResend,
  onRevoke,
  isLoading,
}: InvitationItemProps) {
  const isExpired =
    invitation.status === "pending" && isPast(new Date(invitation.expiresAt));
  const effectiveStatus = isExpired ? "expired" : invitation.status;
  const config = statusConfig[effectiveStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  const isPending = effectiveStatus === "pending";
  const isLink = !invitation.email;

  return (
    <div
      className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-4 transition-all duration-300 hover:bg-card/50 hover:border-primary/30"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Icon */}
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/50 border border-border/40 shrink-0 group-hover:scale-110 transition-transform">
          {isLink ? (
            <Link2 className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Mail className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-foreground truncate">
              {isLink ? "Link zaproszenia" : invitation.email}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5 bg-background/50 border-border/50">
              {roleLabels[invitation.role?.toUpperCase()] || invitation.role}
            </Badge>
            <Badge
              className={cn(
                "gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5 border shadow-sm",
                config.color
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(invitation.createdAt), "d MMM yyyy", {
                locale: pl,
              })}
            </span>
            {isPending && (
              <>
                <span>•</span>
                <span className={isExpired ? "text-red-400 font-bold" : ""}>
                  {isExpired
                    ? "Wygasło"
                    : `Wygasa ${formatDistanceToNow(new Date(invitation.expiresAt), { locale: pl, addSuffix: true })}`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isPending && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl border-border/50 hover:bg-background hover:border-primary/50 transition-all hidden sm:flex gap-2"
            onClick={onCopyLink}
          >
            <Copy className="h-4 w-4" />
            Kopiuj link
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-background border border-transparent hover:border-border/50 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {isPending && (
              <>
                <DropdownMenuItem onClick={onCopyLink} className="rounded-lg sm:hidden">
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiuj link
                </DropdownMenuItem>
                {!isLink && (
                  <DropdownMenuItem onClick={onResend} className="rounded-lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Wyślij ponownie
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRevoke}
                  className="text-destructive focus:text-destructive rounded-lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Anuluj zaproszenie
                </DropdownMenuItem>
              </>
            )}
            {effectiveStatus === "expired" && (
              <DropdownMenuItem onClick={onResend} className="rounded-lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Wyślij ponownie
              </DropdownMenuItem>
            )}
            {effectiveStatus === "accepted" && (
              <DropdownMenuItem disabled className="rounded-lg opacity-50">
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
