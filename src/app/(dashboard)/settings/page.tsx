"use client";

import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { User, Building2, Eye, Settings } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProfileForm, UserProfile } from "@/components/settings/ProfileForm";
import { OrganizationsList, UserOrganization } from "@/components/settings/OrganizationsList";
import { AccessibilitySettings } from "@/components/settings/AccessibilitySettings";
import { SettingsTab } from "@/components/organization/SettingsTab";

import { GET_USER_BY_CLERK_ID_QUERY, GET_USER_ORGANIZATIONS_QUERY } from "@/graphql/queries/users.queries";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { UserByClerkIdResponse, UserOrganizationsResponse, OrganizationByIdResponse } from "@/types/apollo";

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  // Get user data
  const {
    data: userData,
    loading: userLoading,
    refetch: refetchUser,
  } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id },
    skip: !clerkUser?.id,
  });

  // Get user organizations
  const { data: orgsData, loading: orgsLoading, refetch: refetchOrganizations } = useQuery(GET_USER_ORGANIZATIONS_QUERY, {
    skip: !clerkUser?.id,
  });

  // Get current organization details
  const {
    data: orgData,
    loading: orgLoading,
    refetch: refetchOrg,
  } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const organizations = (orgsData as UserOrganizationsResponse)?.userOrganizations || [];
  const organization = (orgData as OrganizationByIdResponse)?.organizationById;

  // Get current user's role in organization
  const currentUserRole = organizations
    .find((o: { organizationId: string; role: string }) => o.organizationId === organizationId)
    ?.role?.toLowerCase();

  const isLoading = userLoading || !clerkUser?.id;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (!userByClerkId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
        </div>
        <Card className="border-border/60">
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="Nie znaleziono profilu"
              description="Wystąpił błąd podczas ładowania danych użytkownika"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const userProfile: UserProfile = {
    id: userByClerkId.id,
    clerkId: userByClerkId.clerkId,
    email: userByClerkId.email,
    fullname: userByClerkId.fullname,
    image: userByClerkId.image,
    personalData: userByClerkId.personalData,
    contactData: userByClerkId.contactData,
  };

  return (
    <div className="space-y-4">
      {/* Tabs with inline header */}
      <Tabs defaultValue="profile" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground" data-testid="settings-page-title">Ustawienia</h1>
          <TabsList className="h-9">
            <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="settings-tab-profile">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="settings-tab-organization">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Organizacja</span>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="settings-tab-organizations">
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Moje organizacje</span>
              <span className="text-muted-foreground">({organizations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="settings-tab-accessibility">
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dostępność</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-4">
          <ProfileForm user={userProfile} clerkId={clerkUser?.id || ""} onSuccess={() => refetchUser()} />
        </TabsContent>

        <TabsContent value="organization" className="mt-4">
          {orgLoading ? (
            <LoadingState type="text" count={2} />
          ) : organization ? (
            <SettingsTab
              organization={organization}
              currentUserRole={currentUserRole}
              isLoading={orgLoading}
              onRefresh={() => refetchOrg()}
            />
          ) : (
            <Card className="border-border/60">
              <CardContent className="py-12">
                <EmptyState
                  icon={Building2}
                  title="Brak aktywnej organizacji"
                  description="Wybierz organizację, aby zarządzać jej ustawieniami"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          {orgsLoading ? (
            <LoadingState type="row" count={3} />
          ) : (
            <OrganizationsList
              organizations={organizations as UserOrganization[]}
              defaultOrganizationId={userByClerkId.organizationIds?.[0]}
              onOrganizationsChange={() => refetchOrganizations()}
            />
          )}
        </TabsContent>

        <TabsContent value="accessibility" className="mt-4">
          <AccessibilitySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
