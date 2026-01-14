"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  UserPlus,
  Mail,
  Phone,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  GET_PATIENT_INVITE_LINKS_QUERY,
} from "@/graphql/queries";
import { CANCEL_PATIENT_INVITE_LINK_MUTATION } from "@/graphql/mutations";
import type {
  GetPatientInviteLinksResponse,
  CancelPatientInviteLinkResponse,
} from "@/types/apollo";
import type { PatientInviteLink } from "@/types/revenue.types";
import { PatientInviteDialog } from "./PatientInviteDialog";
import { ShareInviteButton } from "./ShareInviteButton";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface PatientInvitesCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Components
// ========================================

function InviteStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
          <Clock className="h-3 w-3 mr-1" />
          Oczekuje
        </Badge>
      );
    case "used":
      return (
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Wykorzystany
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Wygasł
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function LinkTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4 text-info" />;
    case "sms":
      return <Phone className="h-4 w-4 text-emerald-500" />;
    case "qr":
      return <QrCode className="h-4 w-4 text-violet-500" />;
    default:
      return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
}

// ========================================
// Component
// ========================================

export function PatientInvitesCard({
  organizationId,
  className,
}: PatientInvitesCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch invites
  const { data, loading, error, refetch } =
    useQuery<GetPatientInviteLinksResponse>(GET_PATIENT_INVITE_LINKS_QUERY, {
      variables: { organizationId: organizationId || "", limit: 20 },
      skip: !organizationId,
      errorPolicy: "all",
    });

  // Cancel invite mutation
  const [cancelInvite] = useMutation<CancelPatientInviteLinkResponse>(
    CANCEL_PATIENT_INVITE_LINK_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_PATIENT_INVITE_LINKS_QUERY,
          variables: { organizationId, limit: 20 },
        },
      ],
      onCompleted: () => {
        toast.success("Zaproszenie zostało anulowane");
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const invites = data?.patientInviteLinks || [];

  // Sort: pending first, then by date
  const sortedInvites = [...invites].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Handle cancel invite
  const handleCancel = (inviteId: string) => {
    cancelInvite({ variables: { inviteLinkId: inviteId } });
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Zaproszenia Pacjentów
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                title="Odśwież"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="gap-2"
                data-testid="invite-patient-btn"
              >
                <UserPlus className="h-4 w-4" />
                Zaproś pacjenta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">
                Nie udało się pobrać zaproszeń
              </p>
            </div>
          ) : sortedInvites.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Brak zaproszeń
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Zaproś pacjentów do wykupienia subskrypcji Premium i zacznij
                zarabiać prowizje.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedInvites.slice(0, 10).map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  onCancel={() => handleCancel(invite.id)}
                />
              ))}
              {sortedInvites.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{sortedInvites.length - 10} więcej zaproszeń
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invite Dialog */}
      <PatientInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}

// ========================================
// Invite Row Component
// ========================================

function InviteRow({
  invite,
  onCancel,
}: {
  invite: PatientInviteLink;
  onCancel: () => void;
}) {
  const fullUrl = `https://fiziyo.pl/start?token=${invite.token}`;

  // Calculate days until expiration
  const expiresAt = new Date(invite.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-colors",
        invite.status === "pending"
          ? "border-border/60 hover:border-primary/30 bg-surface"
          : "border-border/40 bg-muted/30"
      )}
      data-testid={`invite-row-${invite.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Link type icon */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-light border border-border/40 shrink-0">
          <LinkTypeIcon type={invite.linkType} />
        </div>

        {/* Info */}
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {invite.patientName ||
              invite.patientEmail ||
              invite.patientPhone ||
              "Bez danych"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {invite.status === "pending" && daysUntilExpiry > 0 && (
              <span>Wygasa za {daysUntilExpiry} dni</span>
            )}
            {invite.status === "used" && invite.usedAt && (
              <span>
                Użyty{" "}
                {new Date(invite.usedAt).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <InviteStatusBadge status={invite.status} />

        {invite.status === "pending" && (
          <>
            <ShareInviteButton
              url={fullUrl}
              patientName={invite.patientName}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid={`invite-menu-${invite.id}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onCancel}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Anuluj zaproszenie
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
