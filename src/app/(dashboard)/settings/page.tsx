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
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { UserByClerkIdResponse, UserOrganizationsResponse, OrganizationByIdResponse } from "@/types/apollo";

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();
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
    <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6 overflow-hidden bg-background">
      <Tabs defaultValue="profile" className="flex w-full overflow-hidden" orientation="vertical">
        {/* Inner Sidebar */}
        <div className="w-64 border-r border-border/40 bg-transparent flex flex-col shrink-0">
          <div className="p-6">
            <h1 className="text-xl font-bold text-foreground mb-6" data-testid="settings-page-title">Ustawienia</h1>

            <TabsList className="flex flex-col h-auto bg-transparent p-0 items-stretch gap-1">
              <TabsTrigger
                value="profile"
                className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                data-testid="settings-tab-profile"
              >
                <User className="h-4 w-4" />
                Mój profil
              </TabsTrigger>

              {canManageOrganization && (
                <TabsTrigger
                  value="organization"
                  className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                  data-testid="settings-tab-organization"
                >
                  <Settings className="h-4 w-4" />
                  Profil firmy
                </TabsTrigger>
              )}

              <TabsTrigger
                value="organizations"
                className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                data-testid="settings-tab-organizations"
              >
                <Building2 className="h-4 w-4" />
                <span>Organizacje</span>
                <span className="ml-auto text-xs text-muted-foreground/60">{organizations.length}</span>
              </TabsTrigger>

              <TabsTrigger
                value="accessibility"
                className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                data-testid="settings-tab-accessibility"
              >
                <Eye className="h-4 w-4" />
                Wygląd
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-background/30">
          <div className="max-w-4xl mx-auto p-8 lg:p-12 pb-24">
            <TabsContent value="profile" className="mt-0 outline-none">
              <ProfileForm user={userProfile} clerkId={clerkUser?.id || ""} onSuccess={() => refetchUser()} />
            </TabsContent>

            {canManageOrganization && (
              <TabsContent value="organization" className="mt-0 outline-none">
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
                  <Card className="rounded-xl border border-border/50 bg-card/30">
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
            )}

            <TabsContent value="organizations" className="mt-0 outline-none">
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

            <TabsContent value="accessibility" className="mt-0 outline-none">
              <AccessibilitySettings />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
