'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import {
  Building2,
  Users,
  MapPin,
  Settings,
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Camera,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Plus,
  CreditCard,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  MembersTab,
  ClinicsTab,
  SettingsTab,
  InvitationsTab,
  InviteMemberDialog,
  ClinicDialog,
  AssignToClinicDialog,
  Clinic,
  OrganizationMember,
} from '@/components/organization';

import {
  GET_ORGANIZATION_BY_ID_QUERY,
  GET_ORGANIZATION_MEMBERS_QUERY,
  GET_CURRENT_ORGANIZATION_PLAN,
} from '@/graphql/queries/organizations.queries';
import { GET_USER_BY_CLERK_ID_QUERY, GET_USER_ORGANIZATIONS_QUERY } from '@/graphql/queries/users.queries';
import { GET_ORGANIZATION_CLINICS_QUERY } from '@/graphql/queries/clinics.queries';
import {
  UPDATE_ORGANIZATION_NAME_MUTATION,
  UPDATE_ORGANIZATION_LOGO_MUTATION,
  REMOVE_ORGANIZATION_LOGO_MUTATION,
} from '@/graphql/mutations/organizations.mutations';
import type {
  UserByClerkIdResponse,
  OrganizationByIdResponse,
  OrganizationMembersResponse,
  OrganizationClinicsResponse,
  UserOrganizationsResponse,
} from '@/types/apollo';

interface ClinicFromQuery {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  isActive?: boolean;
  organizationId?: string;
}

interface PlanResponse {
  currentOrganizationPlan?: {
    currentPlan?: string;
    expiresAt?: string;
    limits?: {
      maxExercises?: number;
      maxPatients?: number;
      maxTherapists?: number;
      maxClinics?: number;
      allowQRCodes?: boolean;
      allowReports?: boolean;
      allowCustomBranding?: boolean;
      allowSMSReminders?: boolean;
    };
    currentUsage?: {
      exercises?: number;
      patients?: number;
      therapists?: number;
    };
  };
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

export default function OrganizationPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('members');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isClinicDialogOpen, setIsClinicDialogOpen] = useState(false);
  const [isAssignToClinicDialogOpen, setIsAssignToClinicDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [assigningClinic, setAssigningClinic] = useState<Clinic | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const currentUserId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];

  // Get user's role in organization
  const { data: userOrgsData } = useQuery(GET_USER_ORGANIZATIONS_QUERY, {
    skip: !currentUserId,
  });

  const currentUserRole = (userOrgsData as UserOrganizationsResponse)?.userOrganizations
    ?.find((o: { organizationId: string; role: string }) => o.organizationId === organizationId)
    ?.role?.toLowerCase();

  // Get organization details
  const {
    data: orgData,
    loading: orgLoading,
    refetch: refetchOrg,
  } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  // Get members
  const {
    data: membersData,
    loading: membersLoading,
    refetch: refetchMembers,
  } = useQuery(GET_ORGANIZATION_MEMBERS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get clinics
  const {
    data: clinicsData,
    loading: clinicsLoading,
    refetch: refetchClinics,
  } = useQuery(GET_ORGANIZATION_CLINICS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get subscription plan info
  const { data: planData, loading: planLoading } = useQuery(GET_CURRENT_ORGANIZATION_PLAN, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Mutations for editing organization
  const [updateName, { loading: updatingName }] = useMutation(UPDATE_ORGANIZATION_NAME_MUTATION, {
    refetchQueries: organizationId ? [{ query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } }] : [],
  });

  const [updateLogo, { loading: updatingLogo }] = useMutation(UPDATE_ORGANIZATION_LOGO_MUTATION, {
    refetchQueries: organizationId ? [{ query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } }] : [],
  });

  const [removeLogo, { loading: removingLogo }] = useMutation(REMOVE_ORGANIZATION_LOGO_MUTATION, {
    refetchQueries: organizationId ? [{ query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } }] : [],
  });

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const members: OrganizationMember[] = (membersData as OrganizationMembersResponse)?.organizationMembers || [];
  const clinics: ClinicFromQuery[] = (clinicsData as OrganizationClinicsResponse)?.organizationClinics || [];
  const planInfo = (planData as PlanResponse)?.currentOrganizationPlan;

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';
  const RoleIcon = roleIcons[currentUserRole || 'member'] || Building2;
  const isLogoLoading = updatingLogo || removingLogo;

  // Get therapists and patients from members for clinic assignment
  const therapists = members
    .filter((m) => ['owner', 'admin', 'therapist'].includes(m.role.toLowerCase()))
    .map((m) => ({
      id: m.userId,
      fullname: m.user?.fullname,
      email: m.user?.email,
      image: m.user?.image,
    }));

  const patients = members
    .filter((m) => m.role.toLowerCase() === 'patient')
    .map((m) => ({
      id: m.userId,
      fullname: m.user?.fullname,
      email: m.user?.email,
      image: m.user?.image,
    }));

  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setIsClinicDialogOpen(true);
  };

  const handleCloseClinicDialog = () => {
    setIsClinicDialogOpen(false);
    setEditingClinic(null);
  };

  const handleAssignPeople = (clinic: Clinic) => {
    setAssigningClinic(clinic);
    setIsAssignToClinicDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setIsAssignToClinicDialogOpen(false);
    setAssigningClinic(null);
  };

  const handleRefreshAll = () => {
    refetchOrg();
    refetchMembers();
    refetchClinics();
  };

  const handleStartEditName = () => {
    setNewName(organization?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === organization?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateName({
        variables: { organizationId: organization?.id, name: newName.trim() },
      });
      toast.success('Nazwa została zaktualizowana');
      setIsEditingName(false);
    } catch (err) {
      console.error('Błąd podczas aktualizacji:', err);
      toast.error('Nie udało się zaktualizować nazwy');
    }
  };

  const handleCancelEdit = () => {
    setNewName(organization?.name || '');
    setIsEditingName(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Proszę wybrać plik obrazu');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalny rozmiar to 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        await updateLogo({
          variables: { organizationId: organization?.id, logoUrl: dataUrl },
        });
        toast.success('Logo zostało zaktualizowane');
      } catch (err) {
        console.error('Błąd podczas aktualizacji logo:', err);
        toast.error('Nie udało się zaktualizować logo');
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo({
        variables: { organizationId: organization?.id },
      });
      toast.success('Logo zostało usunięte');
    } catch (err) {
      console.error('Błąd podczas usuwania logo:', err);
      toast.error('Nie udało się usunąć logo');
    }
  };

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Building2} title="Brak organizacji" description="Nie jesteś członkiem żadnej organizacji" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organizacja</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Opcje
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActiveTab('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleStartEditName}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj nazwę
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Section: Logo + Info */}
      <div className="flex items-start gap-5">
        {/* Logo with edit capability */}
        <div className="relative group shrink-0">
          <Avatar className="h-20 w-20 ring-4 ring-border/30">
            <AvatarImage src={organization.logoUrl} alt={organization.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
              {organization.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {canEdit && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {isLogoLoading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white hover:bg-white/20">
                      <Camera className="h-5 w-5" />
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
        <div className="flex-1 min-w-0 space-y-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 text-xl font-bold max-w-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="icon" onClick={handleSaveName} disabled={updatingName} className="h-9 w-9">
                {updatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-foreground truncate">{organization.name}</h2>
          )}

          {organization.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{organization.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={organization.isActive ? 'success' : 'secondary'}>
              {organization.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
            {currentUserRole && (
              <Badge variant="outline" className="gap-1">
                <RoleIcon className="h-3 w-3" />
                {roleLabels[currentUserRole] || currentUserRole}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Zaproś użytkownika */}
        {canEdit && (
          <button
            onClick={() => setIsInviteDialogOpen(true)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1 lg:col-span-4"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            
            <div className="relative flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">
                  Zaproś użytkownika
                </h3>
                <p className="text-sm text-white/70">
                  Dodaj do zespołu
                </p>
              </div>
              <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
            </div>
          </button>
        )}

        {/* Quick Stats */}
        <div className={`grid grid-cols-3 gap-3 ${canEdit ? 'sm:col-span-1 lg:col-span-8' : 'sm:col-span-2 lg:col-span-12'}`}>
          {/* Members count */}
          <button
            onClick={() => setActiveTab('members')}
            className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 hover:bg-surface-light hover:border-border cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{members.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Członków</p>
          </button>

          {/* Clinics count */}
          <button
            onClick={() => setActiveTab('clinics')}
            className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 hover:bg-surface-light hover:border-border cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary" />
              <span className="text-2xl font-bold text-foreground">{clinics.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gabinetów</p>
          </button>

          {/* Plan */}
          <button
            onClick={() => setActiveTab('settings')}
            className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 hover:bg-surface-light hover:border-border cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-info" />
              <span className="text-lg font-bold text-foreground">
                {planInfo?.currentPlan || organization.subscriptionPlan || 'Free'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Plan</p>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personel
          </TabsTrigger>
          {canEdit && (
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Zaproszenia
            </TabsTrigger>
          )}
          <TabsTrigger value="clinics" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Gabinety
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ustawienia
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <MembersTab
            members={members}
            organizationId={organizationId!}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isLoading={membersLoading}
            canInvite={canEdit}
            onInviteClick={() => setIsInviteDialogOpen(true)}
            onRefresh={() => refetchMembers()}
          />
        </TabsContent>

        {/* Invitations Tab */}
        {canEdit && organizationId && (
          <TabsContent value="invitations" className="mt-6">
            <InvitationsTab
              organizationId={organizationId}
              onInviteClick={() => setIsInviteDialogOpen(true)}
            />
          </TabsContent>
        )}

        {/* Clinics Tab */}
        <TabsContent value="clinics" className="mt-6">
          <ClinicsTab
            clinics={clinics}
            organizationId={organizationId!}
            isLoading={clinicsLoading}
            canEdit={canEdit}
            onAddClick={() => setIsClinicDialogOpen(true)}
            onEditClinic={handleEditClinic}
            onAssignPeople={handleAssignPeople}
            onRefresh={() => refetchClinics()}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            organization={organization}
            currentUserRole={currentUserRole}
            limits={planInfo?.limits}
            currentUsage={planInfo?.currentUsage}
            isLoading={planLoading}
            onRefresh={handleRefreshAll}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      {organizationId && (
        <InviteMemberDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          organizationId={organizationId}
          organizationName={organization?.name}
          onSuccess={() => refetchMembers()}
        />
      )}

      {/* Clinic Dialog */}
      {organizationId && (
        <ClinicDialog
          open={isClinicDialogOpen}
          onOpenChange={handleCloseClinicDialog}
          clinic={editingClinic}
          organizationId={organizationId}
          onSuccess={() => refetchClinics()}
        />
      )}

      {/* Assign to Clinic Dialog */}
      {organizationId && (
        <AssignToClinicDialog
          open={isAssignToClinicDialogOpen}
          onOpenChange={handleCloseAssignDialog}
          clinic={assigningClinic}
          organizationId={organizationId}
          therapists={therapists}
          patients={patients}
          onSuccess={() => refetchClinics()}
        />
      )}
    </div>
  );
}
