"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Crown,
  Mail,
  MoreVertical,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  REMOVE_MEMBER_MUTATION,
  UPDATE_MEMBER_ROLE_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_MEMBERS_QUERY } from "@/graphql/queries/organizations.queries";
import { cn } from "@/lib/utils";

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  status?: string;
  joinedAt?: string;
  user?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  };
}

interface MemberCardProps {
  member: OrganizationMember;
  organizationId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onRefresh?: () => void;
  /** Number of patients assigned to this team member (from billing data) */
  assignedPatientsCount?: number;
}

const roleConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    variant: "default" | "secondary" | "outline";
    color: string;
  }
> = {
  owner: {
    label: "Właściciel",
    icon: Crown,
    variant: "default",
    color: "text-amber-500",
  },
  admin: {
    label: "Administrator",
    icon: ShieldCheck,
    variant: "secondary",
    color: "text-blue-500",
  },
  therapist: {
    label: "Fizjoterapeuta",
    icon: User,
    variant: "outline",
    color: "text-primary",
  },
  member: {
    label: "Członek",
    icon: User,
    variant: "outline",
    color: "text-muted-foreground",
  },
};

export function MemberCard({
  member,
  organizationId,
  currentUserId,
  currentUserRole,
  onRefresh,
  assignedPatientsCount,
}: MemberCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const [removeMember, { loading: removing }] = useMutation(
    REMOVE_MEMBER_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_ORGANIZATION_MEMBERS_QUERY,
          variables: { organizationId },
        },
      ],
    }
  );

  const [updateRole, { loading: updatingRole }] = useMutation(
    UPDATE_MEMBER_ROLE_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_ORGANIZATION_MEMBERS_QUERY,
          variables: { organizationId },
        },
      ],
    }
  );

  const displayName = member.user?.fullname || member.user?.email || "Nieznany";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isCurrentUser = member.userId === currentUserId;
  const role = member.role.toLowerCase();
  const config = roleConfig[role] || roleConfig.member;
  const RoleIcon = config.icon;

  const canManageMember = () => {
    if (isCurrentUser) return false;
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin" && role !== "owner" && role !== "admin")
      return true;
    return false;
  };

  const handleRemove = async () => {
    try {
      await removeMember({
        variables: { memberId: member.id },
      });
      toast.success("Członek został usunięty z organizacji");
      setIsDeleteDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć użytkownika");
    }
  };

  const handleChangeRole = async () => {
    if (!pendingRole) return;

    try {
      await updateRole({
        variables: { memberId: member.id, role: pendingRole },
      });
      toast.success("Rola została zmieniona");
      setIsChangeRoleDialogOpen(false);
      setPendingRole(null);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas zmiany roli:", error);
      toast.error("Nie udało się zmienić roli");
    }
  };

  const initiateRoleChange = (newRole: string) => {
    setPendingRole(newRole);
    setIsChangeRoleDialogOpen(true);
  };

  return (
    <>
      <Card
        data-testid={`org-member-card-${member.id}`}
        className={cn(
          "group rounded-xl border border-border/50 bg-card/30 transition-all duration-300",
          "hover:bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          isCurrentUser && "ring-1 ring-primary/20 bg-primary/5 border-primary/20"
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-14 w-14 border border-border/50 shadow-sm transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={member.user?.image} alt={displayName} />
              <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary-dark/20 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {displayName}
                </span>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                    Ty
                  </Badge>
                )}
              </div>

              {/* Email */}
              {member.user?.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.user.email}</span>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1.5 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5 bg-background/50 border-border/50",
                    config.color
                  )}
                >
                  <RoleIcon className="h-3 w-3" />
                  {config.label}
                </Badge>

                {/* Patients count badge - shows workload */}
                {assignedPatientsCount !== undefined && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1.5 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-5 border shadow-xs",
                      assignedPatientsCount > 0
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {assignedPatientsCount} {assignedPatientsCount === 1 ? "pacjent" : "pacjentów"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManageMember() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl hover:bg-background border border-transparent hover:border-border/50 transition-all opacity-0 group-hover:opacity-100"
                    data-testid={`org-member-menu-${member.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  {/* Role change options */}
                  {currentUserRole === "owner" && (
                    <>
                      {role !== "admin" && (
                        <DropdownMenuItem
                          onClick={() => initiateRoleChange("admin")}
                          className="rounded-lg"
                          data-testid={`org-member-set-admin-${member.id}`}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
                          Ustaw jako Administrator
                        </DropdownMenuItem>
                      )}
                      {role !== "therapist" && (
                        <DropdownMenuItem
                          onClick={() => initiateRoleChange("therapist")}
                          className="rounded-lg"
                          data-testid={`org-member-set-therapist-${member.id}`}
                        >
                          <User className="mr-2 h-4 w-4 text-primary" />
                          Ustaw jako Fizjoterapeuta
                        </DropdownMenuItem>
                      )}
                      {role !== "member" && (
                        <DropdownMenuItem
                          onClick={() => initiateRoleChange("member")}
                          className="rounded-lg"
                          data-testid={`org-member-set-member-${member.id}`}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Ustaw jako Członek
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-border/50" />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive rounded-lg"
                    data-testid={`org-member-remove-${member.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń z organizacji
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń użytkownika"
        description={`Czy na pewno chcesz usunąć ${displayName} z organizacji? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemove}
        isLoading={removing}
      />

      {/* Role change confirmation */}
      <ConfirmDialog
        open={isChangeRoleDialogOpen}
        onOpenChange={setIsChangeRoleDialogOpen}
        title="Zmień rolę"
        description={`Czy na pewno chcesz zmienić rolę ${displayName} na "${
          pendingRole ? roleConfig[pendingRole]?.label || pendingRole : ""
        }"?`}
        confirmText="Zmień rolę"
        variant="default"
        onConfirm={handleChangeRole}
        isLoading={updatingRole}
      />
    </>
  );
}
