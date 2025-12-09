"use client";

import { useMutation } from "@apollo/client/react";
import { MoreVertical, Pencil, Trash2, Shield, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useState } from "react";

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

interface MembersListProps {
  members: OrganizationMember[];
  organizationId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onRefresh?: () => void;
}

const roleLabels: Record<string, string> = {
  owner: "Właściciel",
  admin: "Administrator",
  member: "Członek",
};

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

export function MembersList({
  members,
  organizationId,
  currentUserId,
  currentUserRole,
  onRefresh,
}: MembersListProps) {
  const [removingMember, setRemovingMember] = useState<OrganizationMember | null>(null);

  const [removeMember, { loading: removing }] = useMutation(REMOVE_MEMBER_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_MEMBERS_QUERY, variables: { organizationId } },
    ],
  });

  const [updateRole] = useMutation(UPDATE_MEMBER_ROLE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_MEMBERS_QUERY, variables: { organizationId } },
    ],
  });

  const handleRemove = async () => {
    if (!removingMember) return;

    try {
      await removeMember({
        variables: { memberId: removingMember.id },
      });
      toast.success("Członek został usunięty");
      setRemovingMember(null);
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć członka");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await updateRole({
        variables: { memberId, role: newRole },
      });
      toast.success("Rola została zmieniona");
      onRefresh?.();
    } catch (error) {
      console.error("Błąd podczas zmiany roli:", error);
      toast.error("Nie udało się zmienić roli");
    }
  };

  const canManageMember = (member: OrganizationMember) => {
    if (member.userId === currentUserId) return false;
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin" && member.role === "member") return true;
    return false;
  };

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const displayName = member.user?.fullname || member.user?.email || "Nieznany";
          const initials = displayName.slice(0, 2).toUpperCase();
          const canManage = canManageMember(member);
          const isCurrentUser = member.userId === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user?.image} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{displayName}</span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        Ty
                      </Badge>
                    )}
                  </div>
                  {member.user?.email && (
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={roleColors[member.role] || "outline"}>
                  {member.role === "owner" && <ShieldCheck className="mr-1 h-3 w-3" />}
                  {member.role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                  {member.role === "member" && <User className="mr-1 h-3 w-3" />}
                  {roleLabels[member.role] || member.role}
                </Badge>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role !== "admin" && currentUserRole === "owner" && (
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, "admin")}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Ustaw jako admin
                        </DropdownMenuItem>
                      )}
                      {member.role === "admin" && currentUserRole === "owner" && (
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, "member")}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Ustaw jako członek
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setRemovingMember(member)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń z organizacji
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title="Usuń członka"
        description={`Czy na pewno chcesz usunąć ${removingMember?.user?.fullname || "tego członka"} z organizacji?`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemove}
        isLoading={removing}
      />
    </>
  );
}

