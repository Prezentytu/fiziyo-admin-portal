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
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  GET_ORGANIZATION_INVITATION_STATS_QUERY,
} from "@/graphql/queries/organizations.queries";
import {
  RESEND_INVITATION_MUTATION,
  REVOKE_INVITATION_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import type {
  OrganizationInvitationsResponse,
  OrganizationInvitationStatsResponse,
  OrganizationInvitation,
} from "@/types/apollo";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface InvitationsTabProps {
  organizationId: string;
  onInviteClick?: () => void;
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

export function InvitationsTab({
  organizationId,
  onInviteClick,
}: InvitationsTabProps) {
  const [filter, setFilter] = useState<string>("all");

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

  // Fetch stats
  const { data: statsData, loading: statsLoading } =
    useQuery<OrganizationInvitationStatsResponse>(
      GET_ORGANIZATION_INVITATION_STATS_QUERY,
      {
        variables: { organizationId },
        skip: !organizationId,
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
  const stats = statsData?.organizationInvitationStats;

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "all") return true;
    // Check for expired pending
    if (filter === "pending") {
      return inv.status === "pending" && !isPast(new Date(inv.expiresAt));
    }
    if (filter === "expired") {
      return (
        inv.status === "expired" ||
        (inv.status === "pending" && isPast(new Date(inv.expiresAt)))
      );
    }
    return inv.status === filter;
  });

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

  // Loading state
  if (invitationsLoading && !invitationsData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Hero Action - Invite */}
        <button
          onClick={onInviteClick}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-4 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer lg:col-span-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white">Zaproś osobę</h3>
              <p className="text-xs text-white/80">Email lub link</p>
            </div>
          </div>
        </button>

        {/* Stats */}
        <StatCard
          label="Oczekujące"
          count={stats?.pending || 0}
          icon={Clock}
          isActive={filter === "pending"}
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
          loading={statsLoading}
        />
        <StatCard
          label="Zaakceptowane"
          count={stats?.accepted || 0}
          icon={Check}
          isActive={filter === "accepted"}
          onClick={() => setFilter(filter === "accepted" ? "all" : "accepted")}
          loading={statsLoading}
        />
        <StatCard
          label="Wszystkie"
          count={stats?.total || 0}
          icon={Mail}
          isActive={filter === "all"}
          onClick={() => setFilter("all")}
          loading={statsLoading}
        />
      </div>

      {/* Invitations List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Zaproszenia
              {filter !== "all" && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {statusConfig[filter]?.label || filter}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchInvitations()}
              disabled={invitationsLoading}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  invitationsLoading && "animate-spin"
                )}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Brak zaproszeń"
              description={
                filter === "all"
                  ? "Wyślij zaproszenie, aby dodać nową osobę do organizacji"
                  : `Brak zaproszeń o statusie "${statusConfig[filter]?.label || filter}"`
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredInvitations.map((invitation) => (
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
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// Sub-components
// ========================================

interface StatCardProps {
  label: string;
  count: number;
  icon: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

function StatCard({
  label,
  count,
  icon: Icon,
  isActive,
  onClick,
  loading,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        isActive
          ? "border-primary shadow-lg shadow-primary/10"
          : "border-border/60 hover:border-border hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
              isActive ? "bg-primary/20" : "bg-surface-light"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-8" />
            ) : (
              <p className="text-xl font-bold text-foreground">{count}</p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
    <div className="group flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3 transition-all duration-200 hover:bg-surface-light hover:border-border">
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
              {format(new Date(invitation.createdAt), "d MMM yyyy, HH:mm", {
                locale: pl,
              })}
            </span>
            {invitation.invitedBy && (
              <>
                <span>•</span>
                <span>przez {invitation.invitedBy.fullname || invitation.invitedBy.email}</span>
              </>
            )}
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



