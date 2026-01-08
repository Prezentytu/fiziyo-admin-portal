"use client";

import { useState, useRef } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Camera,
  Check,
  Crown,
  Loader2,
  Pencil,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UPDATE_ORGANIZATION_NAME_MUTATION,
  UPDATE_ORGANIZATION_LOGO_MUTATION,
  REMOVE_ORGANIZATION_LOGO_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";

interface Organization {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  subscriptionPlan?: string;
}

interface OrganizationHeroProps {
  organization: Organization;
  currentUserRole?: string;
  planName?: string;
  onRefresh?: () => void;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Właściciel", icon: Crown, color: "text-amber-500" },
  admin: { label: "Administrator", icon: Shield, color: "text-blue-500" },
  therapist: { label: "Fizjoterapeuta", icon: User, color: "text-primary" },
  member: { label: "Członek", icon: User, color: "text-muted-foreground" },
};

export function OrganizationHero({
  organization,
  currentUserRole,
  planName,
  onRefresh,
}: OrganizationHeroProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(organization.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";
  const roleInfo = roleConfig[currentUserRole || "member"] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

  const [updateName, { loading: updatingName }] = useMutation(
    UPDATE_ORGANIZATION_NAME_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const [updateLogo, { loading: updatingLogo }] = useMutation(
    UPDATE_ORGANIZATION_LOGO_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const [removeLogo, { loading: removingLogo }] = useMutation(
    REMOVE_ORGANIZATION_LOGO_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organization.id } },
      ],
    }
  );

  const isLogoLoading = updatingLogo || removingLogo;

  const handleSaveName = async () => {
    if (!newName.trim() || newName === organization.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateName({
        variables: { organizationId: organization.id, name: newName.trim() },
      });
      toast.success("Nazwa została zaktualizowana");
      setIsEditingName(false);
      onRefresh?.();
    } catch (err) {
      console.error("Błąd podczas aktualizacji:", err);
      toast.error("Nie udało się zaktualizować nazwy");
    }
  };

  const handleCancelEdit = () => {
    setNewName(organization.name);
    setIsEditingName(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Proszę wybrać plik obrazu");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Plik jest zbyt duży. Maksymalny rozmiar to 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        await updateLogo({
          variables: { organizationId: organization.id, logoUrl: dataUrl },
        });
        toast.success("Logo zostało zaktualizowane");
        onRefresh?.();
      } catch (err) {
        console.error("Błąd podczas aktualizacji logo:", err);
        toast.error("Nie udało się zaktualizować logo");
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo({
        variables: { organizationId: organization.id },
      });
      toast.success("Logo zostało usunięte");
      onRefresh?.();
    } catch (err) {
      console.error("Błąd podczas usuwania logo:", err);
      toast.error("Nie udało się usunąć logo");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-surface via-surface to-surface-light p-6">
      {/* Subtle background decoration */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/5 rounded-full blur-2xl" />

      <div className="relative flex items-start gap-6">
        {/* Logo with edit capability */}
        <div className="relative group shrink-0">
          <Avatar className="h-20 w-20 ring-4 ring-border/20 shadow-xl">
            <AvatarImage src={organization.logoUrl} alt={organization.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
              {organization.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {canEdit && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {isLogoLoading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full text-white hover:bg-white/20"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      {organization.logoUrl ? "Zmień logo" : "Dodaj logo"}
                    </DropdownMenuItem>
                    {organization.logoUrl && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleRemoveLogo}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń logo
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Organization details */}
        <div className="flex-1 min-w-0 space-y-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 text-xl font-bold max-w-sm bg-surface"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <Button
                size="icon"
                onClick={handleSaveName}
                disabled={updatingName}
                className="h-9 w-9"
              >
                {updatingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground truncate">
                {organization.name}
              </h2>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNewName(organization.name);
                    setIsEditingName(true);
                  }}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {organization.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {organization.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={organization.isActive ? "success" : "secondary"}>
              {organization.isActive ? "Aktywna" : "Nieaktywna"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-surface/50">
              <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
              {roleInfo.label}
            </Badge>
            {planName && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                {planName}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



