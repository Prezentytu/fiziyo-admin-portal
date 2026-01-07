'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { Building2, Camera, Check, Crown, Loader2, Pencil, Settings, Shield, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UPDATE_ORGANIZATION_NAME_MUTATION,
  UPDATE_ORGANIZATION_LOGO_MUTATION,
  REMOVE_ORGANIZATION_LOGO_MUTATION,
} from '@/graphql/mutations/organizations.mutations';
import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';

interface Organization {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  subscriptionPlan?: string;
  creationTime?: string;
}

interface OrganizationHeaderProps {
  organization: Organization;
  currentUserRole?: string;
  membersCount: number;
  clinicsCount: number;
  onInviteClick: () => void;
  onSettingsClick: () => void;
}

const roleLabels: Record<string, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  member: 'Członek',
  therapist: 'Fizjoterapeuta',
};

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Building2,
  therapist: Building2,
};

export function OrganizationHeader({
  organization,
  currentUserRole,
  membersCount,
  clinicsCount,
  onInviteClick,
  onSettingsClick,
}: OrganizationHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(organization.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const [updateName, { loading: updatingName }] = useMutation(UPDATE_ORGANIZATION_NAME_MUTATION, {
    refetchQueries: [
      {
        query: GET_ORGANIZATION_BY_ID_QUERY,
        variables: { id: organization.id },
      },
    ],
  });

  const [updateLogo, { loading: updatingLogo }] = useMutation(UPDATE_ORGANIZATION_LOGO_MUTATION, {
    refetchQueries: [
      {
        query: GET_ORGANIZATION_BY_ID_QUERY,
        variables: { id: organization.id },
      },
    ],
  });

  const [removeLogo, { loading: removingLogo }] = useMutation(REMOVE_ORGANIZATION_LOGO_MUTATION, {
    refetchQueries: [
      {
        query: GET_ORGANIZATION_BY_ID_QUERY,
        variables: { id: organization.id },
      },
    ],
  });

  const handleSaveName = async () => {
    if (!newName.trim() || newName === organization.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateName({
        variables: { organizationId: organization.id, name: newName.trim() },
      });
      toast.success('Nazwa została zaktualizowana');
      setIsEditingName(false);
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      toast.error('Nie udało się zaktualizować nazwy');
    }
  };

  const handleCancelEdit = () => {
    setNewName(organization.name);
    setIsEditingName(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Proszę wybrać plik obrazu');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalny rozmiar to 2MB');
      return;
    }

    // For now, we'll use a data URL. In production, you'd upload to a storage service
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        await updateLogo({
          variables: { organizationId: organization.id, logoUrl: dataUrl },
        });
        toast.success('Logo zostało zaktualizowane');
      } catch (error) {
        console.error('Błąd podczas aktualizacji logo:', error);
        toast.error('Nie udało się zaktualizować logo');
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo({
        variables: { organizationId: organization.id },
      });
      toast.success('Logo zostało usunięte');
    } catch (error) {
      console.error('Błąd podczas usuwania logo:', error);
      toast.error('Nie udało się usunąć logo');
    }
  };

  const RoleIcon = roleIcons[currentUserRole || 'member'] || Building2;
  const isLogoLoading = updatingLogo || removingLogo;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Organizacja</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={onInviteClick}>
              <UserPlus className="mr-2 h-4 w-4" />
              Zaproś użytkownika
            </Button>
          )}
          <Button variant="outline" onClick={onSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            Ustawienia
          </Button>
        </div>
      </div>

      {/* Organization info */}
      <div className="flex items-start gap-4">
        {/* Logo with edit capability */}
        <div className="relative group">
          <Avatar className="h-16 w-16">
            <AvatarImage src={organization.logoUrl} alt={organization.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {organization.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Logo edit overlay */}
          {canEdit && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {isLogoLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white hover:bg-white/20">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      {organization.logoUrl ? 'Zmień logo' : 'Dodaj logo'}
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

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>

        {/* Organization details */}
        <div className="flex-1 space-y-2">
          {/* Name with inline edit */}
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-lg font-semibold max-w-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="icon" onClick={handleSaveName} disabled={updatingName} className="h-8 w-8">
                {updatingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{organization.name}</span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingName(true)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Description */}
          {organization.description && <p className="text-sm text-muted-foreground">{organization.description}</p>}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={organization.isActive ? 'success' : 'secondary'}>
              {organization.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
            {organization.subscriptionPlan && <Badge variant="outline">Plan: {organization.subscriptionPlan}</Badge>}
            {currentUserRole && (
              <Badge variant="secondary" className="gap-1">
                <RoleIcon className="h-3 w-3" />
                {roleLabels[currentUserRole] || currentUserRole}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              {membersCount} członków
            </Badge>
            <Badge variant="outline" className="gap-1">
              {clinicsCount} gabinetów
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}











