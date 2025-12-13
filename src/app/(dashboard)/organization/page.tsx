'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Building2, Users, MapPin, Settings } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  OrganizationHeader,
  MembersTab,
  ClinicsTab,
  SettingsTab,
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

export default function OrganizationPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isClinicDialogOpen, setIsClinicDialogOpen] = useState(false);
  const [isAssignToClinicDialogOpen, setIsAssignToClinicDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [assigningClinic, setAssigningClinic] = useState<Clinic | null>(null);

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

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const members: OrganizationMember[] = (membersData as OrganizationMembersResponse)?.organizationMembers || [];
  const clinics: ClinicFromQuery[] = (clinicsData as OrganizationClinicsResponse)?.organizationClinics || [];
  const planInfo = (planData as PlanResponse)?.currentOrganizationPlan;

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

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

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  const handleRefreshAll = () => {
    refetchOrg();
    refetchMembers();
    refetchClinics();
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
      {/* Header */}
      <OrganizationHeader
        organization={organization}
        currentUserRole={currentUserRole}
        membersCount={members.length}
        clinicsCount={clinics.length}
        onInviteClick={() => setIsInviteDialogOpen(true)}
        onSettingsClick={handleSettingsClick}
      />

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

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Members preview */}
            <MembersTab
              members={members.slice(0, 6)}
              organizationId={organizationId!}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isLoading={membersLoading}
              canInvite={canEdit}
              onInviteClick={() => setIsInviteDialogOpen(true)}
              onRefresh={() => refetchMembers()}
            />

            {/* Clinics preview */}
            <ClinicsTab
              clinics={clinics.slice(0, 4)}
              organizationId={organizationId!}
              isLoading={clinicsLoading}
              canEdit={canEdit}
              onAddClick={() => setIsClinicDialogOpen(true)}
              onEditClinic={handleEditClinic}
              onAssignPeople={handleAssignPeople}
              onRefresh={() => refetchClinics()}
            />
          </div>
        </TabsContent>

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
