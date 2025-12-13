'use client';

import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Settings, User, Building2, Calendar } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProfileForm, UserProfile } from '@/components/settings/ProfileForm';
import { OrganizationsList, UserOrganization } from '@/components/settings/OrganizationsList';

import { GET_USER_BY_CLERK_ID_QUERY, GET_USER_ORGANIZATIONS_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse, UserOrganizationsResponse } from '@/types/apollo';

export default function SettingsPage() {
  const { user: clerkUser } = useUser();

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
  const { data: orgsData, loading: orgsLoading } = useQuery(GET_USER_ORGANIZATIONS_QUERY, {
    skip: !clerkUser?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const organizations = (orgsData as UserOrganizationsResponse)?.userOrganizations || [];

  const isLoading = userLoading || !clerkUser?.id;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ustawienia</h1>
          <p className="text-muted-foreground text-sm mt-1">Zarządzaj swoim kontem i preferencjami</p>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (!userByClerkId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Ustawienia</h1>
          <p className="text-muted-foreground text-sm mt-1">Zarządzaj swoim kontem i preferencjami</p>
        </div>
        <Card>
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Ustawienia</h1>
        <p className="text-muted-foreground text-sm mt-1">Zarządzaj swoim kontem i preferencjami</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizacje ({organizations.length})
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferencje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm user={userProfile} clerkId={clerkUser?.id || ''} onSuccess={() => refetchUser()} />
        </TabsContent>

        <TabsContent value="organizations">
          {orgsLoading ? (
            <LoadingState type="row" count={3} />
          ) : (
            <OrganizationsList
              organizations={organizations as UserOrganization[]}
              defaultOrganizationId={userByClerkId.organizationIds?.[0]}
            />
          )}
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-primary" />
                Preferencje aplikacji
              </CardTitle>
              <CardDescription>Dostosuj aplikację do swoich potrzeb</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for calendar settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Kalendarz wizyt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Funkcjonalność kalendarza wizyt będzie dostępna w przyszłej wersji aplikacji.
                    </p>
                  </CardContent>
                </Card>

                <p className="text-sm text-muted-foreground text-center py-4">
                  Dodatkowe preferencje będą dostępne wkrótce
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
