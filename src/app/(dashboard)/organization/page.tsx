"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { Plus, Building2, Users, MapPin, Settings, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MembersList, OrganizationMember } from "@/components/organization/MembersList";
import { InviteMemberDialog } from "@/components/organization/InviteMemberDialog";

import { GET_ORGANIZATION_BY_ID_QUERY, GET_ORGANIZATION_MEMBERS_QUERY } from "@/graphql/queries/organizations.queries";
import { GET_USER_BY_CLERK_ID_QUERY, GET_USER_ORGANIZATIONS_QUERY } from "@/graphql/queries/users.queries";
import { UPDATE_ORGANIZATION_NAME_MUTATION } from "@/graphql/mutations/organizations.mutations";
import { GET_ORGANIZATION_CLINICS_QUERY } from "@/graphql/queries/clinics.queries";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { UserByClerkIdResponse, OrganizationByIdResponse, OrganizationMembersResponse, OrganizationClinicsResponse, UserOrganizationsResponse } from "@/types/apollo";

export default function OrganizationPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

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

  const currentUserRole = (userOrgsData as UserOrganizationsResponse)?.userOrganizations?.find(
    (o: { organizationId: string; role: string }) => o.organizationId === organizationId
  )?.role?.toLowerCase();

  // Get organization details
  const { data: orgData, loading: orgLoading, refetch: refetchOrg } = useQuery(
    GET_ORGANIZATION_BY_ID_QUERY,
    {
      variables: { id: organizationId },
      skip: !organizationId,
    }
  );

  // Get members
  const { data: membersData, loading: membersLoading, refetch: refetchMembers } = useQuery(
    GET_ORGANIZATION_MEMBERS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Get clinics
  const { data: clinicsData, loading: clinicsLoading } = useQuery(
    GET_ORGANIZATION_CLINICS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Update name mutation
  const [updateName, { loading: updatingName }] = useMutation(UPDATE_ORGANIZATION_NAME_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_BY_ID_QUERY, variables: { id: organizationId } }],
  });

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const members: OrganizationMember[] = (membersData as OrganizationMembersResponse)?.organizationMembers || [];
  const clinics = (clinicsData as OrganizationClinicsResponse)?.organizationClinics || [];

  const handleSaveName = async () => {
    if (!newName.trim() || !organizationId) return;

    try {
      await updateName({
        variables: { organizationId, name: newName.trim() },
      });
      toast.success("Nazwa została zaktualizowana");
      setIsEditingName(false);
    } catch (error) {
      console.error("Błąd podczas aktualizacji:", error);
      toast.error("Nie udało się zaktualizować nazwy");
    }
  };

  const startEditingName = () => {
    setNewName(organization?.name || "");
    setIsEditingName(true);
  };

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";

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
        <EmptyState
          icon={Building2}
          title="Brak organizacji"
          description="Nie jesteś członkiem żadnej organizacji"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={organization.logoUrl} alt={organization.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {organization.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-xs"
                autoFocus
              />
              <Button onClick={handleSaveName} disabled={updatingName} size="sm">
                {updatingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingName(false)}
              >
                Anuluj
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={startEditingName}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={organization.isActive ? "success" : "secondary"}>
              {organization.isActive ? "Aktywna" : "Nieaktywna"}
            </Badge>
            {organization.subscriptionPlan && (
              <Badge variant="outline">{organization.subscriptionPlan}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personel ({members.length})
          </TabsTrigger>
          <TabsTrigger value="clinics" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Gabinety ({clinics.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ustawienia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informacje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {organization.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Opis</p>
                    <p className="font-medium">{organization.description}</p>
                  </div>
                )}
                {organization.creationTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data utworzenia</p>
                    <p className="font-medium">
                      {format(new Date(organization.creationTime), "d MMMM yyyy", {
                        locale: pl,
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statystyki</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{members.length}</p>
                    <p className="text-sm text-muted-foreground">Członków</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-3xl font-bold">{clinics.length}</p>
                    <p className="text-sm text-muted-foreground">Gabinetów</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personel</CardTitle>
                <CardDescription>Zarządzaj członkami organizacji</CardDescription>
              </div>
              {canEdit && (
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Zaproś
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <LoadingState type="row" count={3} />
              ) : members.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Brak członków"
                  description="Zaproś pierwszego członka do organizacji"
                  actionLabel={canEdit ? "Zaproś" : undefined}
                  onAction={canEdit ? () => setIsInviteDialogOpen(true) : undefined}
                />
              ) : (
                <MembersList
                  members={members}
                  organizationId={organizationId!}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onRefresh={() => refetchMembers()}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinics" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gabinety</CardTitle>
                <CardDescription>Lokalizacje prowadzenia działalności</CardDescription>
              </div>
              {canEdit && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj gabinet
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {clinicsLoading ? (
                <LoadingState type="row" count={3} />
              ) : clinics.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="Brak gabinetów"
                  description="Dodaj pierwszy gabinet do organizacji"
                  actionLabel={canEdit ? "Dodaj gabinet" : undefined}
                  onAction={canEdit ? () => {} : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {clinics.map((clinic: {
                    id: string;
                    name: string;
                    address?: string;
                    contactInfo?: string;
                    isActive?: boolean;
                  }) => (
                    <div
                      key={clinic.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{clinic.name}</p>
                          {clinic.address && (
                            <p className="text-sm text-muted-foreground">{clinic.address}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={clinic.isActive ? "success" : "secondary"}>
                        {clinic.isActive ? "Aktywny" : "Nieaktywny"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia organizacji</CardTitle>
              <CardDescription>
                Konfiguracja i preferencje organizacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Settings}
                title="Ustawienia"
                description="Szczegółowe ustawienia będą dostępne wkrótce"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      {organizationId && (
        <InviteMemberDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          organizationId={organizationId}
          onSuccess={() => refetchMembers()}
        />
      )}
    </div>
  );
}
