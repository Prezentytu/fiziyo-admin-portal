"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import {
  Building2,
  Users,
  MapPin,
  Mail,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import {
  InviteMemberDialog,
  ClinicDialog,
  AssignToClinicDialog,
} from "@/components/organization";
import { TeamSection } from "@/components/organization/TeamSection";
import { ClinicsSection, Clinic } from "@/components/organization/ClinicsSection";
import { InvitationsSection } from "@/components/organization/InvitationsSection";
import type { OrganizationMember } from "@/components/organization/MemberCard";

import {
  GET_ORGANIZATION_BY_ID_QUERY,
  GET_ORGANIZATION_MEMBERS_QUERY,
  GET_CURRENT_ORGANIZATION_PLAN,
  GET_ORGANIZATION_INVITATION_STATS_QUERY,
} from "@/graphql/queries/organizations.queries";
import { GET_USER_BY_CLERK_ID_QUERY, GET_USER_ORGANIZATIONS_QUERY } from "@/graphql/queries/users.queries";
import { GET_ORGANIZATION_CLINICS_QUERY } from "@/graphql/queries/clinics.queries";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import { useOrganization } from "@/contexts/OrganizationContext";
import type {
  UserByClerkIdResponse,
  OrganizationByIdResponse,
  OrganizationMembersResponse,
  OrganizationClinicsResponse,
  UserOrganizationsResponse,
  OrganizationInvitationStatsResponse,
  GetCurrentBillingStatusResponse,
} from "@/types/apollo";

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

// Filter out patients - only show staff members
const STAFF_ROLES = new Set(["owner", "admin", "therapist", "member"]);

export default function OrganizationPage() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("team");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isClinicDialogOpen, setIsClinicDialogOpen] = useState(false);
  const [isAssignToClinicDialogOpen, setIsAssignToClinicDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [assigningClinic, setAssigningClinic] = useState<Clinic | null>(null);

  // Get organization ID from context
  const organizationId = currentOrganization?.organizationId;

  // Get user data for currentUserId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const currentUserId = userByClerkId?.id;

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
  const { data: planData } = useQuery(GET_CURRENT_ORGANIZATION_PLAN, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get billing status (for therapist patient counts)
  const { data: billingData } = useQuery<GetCurrentBillingStatusResponse>(
    GET_CURRENT_BILLING_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  // Get invitation stats (for KPI card)
  const { data: invitationStatsData } = useQuery<OrganizationInvitationStatsResponse>(
    GET_ORGANIZATION_INVITATION_STATS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const members: OrganizationMember[] = (membersData as OrganizationMembersResponse)?.organizationMembers || [];
  const clinics: ClinicFromQuery[] = (clinicsData as OrganizationClinicsResponse)?.organizationClinics || [];
  const planInfo = (planData as PlanResponse)?.currentOrganizationPlan;

  // Count only staff members (exclude patients)
  const staffMembers = members.filter((m) => STAFF_ROLES.has(m.role.toLowerCase()));
  const teamCount = staffMembers.length;
  const clinicsCount = clinics.length;
  const planName = planInfo?.currentPlan || organization?.subscriptionPlan || "Free";

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";

  // Billing data for patient counts
  const billingStatus = billingData?.currentBillingStatus;
  // Create map of therapist -> patient count
  const therapistPatientCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (billingStatus?.therapistBreakdown) {
      for (const t of billingStatus.therapistBreakdown) {
        map.set(t.therapistId, t.activePatientsCount);
      }
    }
    return map;
  }, [billingStatus?.therapistBreakdown]);

  // Invitation stats
  const invitationStats = invitationStatsData?.organizationInvitationStats;
  const pendingInvitations = invitationStats?.pending ?? 0;

  // Get therapists for clinic assignment (filter out patients)
  const therapists = members
    .filter((m) => ["owner", "admin", "therapist"].includes(m.role.toLowerCase()))
    .map((m) => ({
      id: m.userId,
      fullname: m.user?.fullname,
      email: m.user?.email,
      image: m.user?.image,
    }));

  // Patients for clinic assignment
  const patients = members
    .filter((m) => m.role.toLowerCase() === "patient")
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
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6 overflow-hidden bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full overflow-hidden" orientation="vertical">
          {/* Inner Sidebar */}
          <div className="w-64 border-r border-border/40 bg-transparent flex flex-col shrink-0">
            <div className="p-6">
              <h1 className="text-xl font-bold text-foreground mb-6" data-testid="org-page-title">Mój Zespół</h1>

              <TabsList className="flex flex-col h-auto bg-transparent p-0 items-stretch gap-1">
                <TabsTrigger
                  value="team"
                  className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                  data-testid="org-tab-team"
                >
                  <Users className="h-4 w-4" />
                  <span>Pracownicy</span>
                  <span className="ml-auto text-xs text-muted-foreground/60">{teamCount}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="clinics"
                  className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                  data-testid="org-tab-clinics"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Gabinety</span>
                  <span className="ml-auto text-xs text-muted-foreground/60">{clinicsCount}</span>
                </TabsTrigger>

                {canEdit && (
                  <TabsTrigger
                    value="invitations"
                    className="justify-start gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 data-[state=active]:bg-accent/50 data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none transition-all rounded-lg"
                    data-testid="org-tab-invitations"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Zaproszenia</span>
                    {pendingInvitations > 0 && (
                      <Badge className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1.5 h-4">
                        {pendingInvitations}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-background/30">
            <div className="max-w-5xl mx-auto p-8 lg:p-12">
              <TabsContent value="team" className="mt-0 outline-none">
                <TeamSection
                  members={members}
                  organizationId={organizationId!}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  isLoading={membersLoading}
                  canInvite={canEdit}
                  onInviteClick={() => setIsInviteDialogOpen(true)}
                  onRefresh={() => refetchMembers()}
                  limits={planInfo?.limits}
                  currentUsage={planInfo?.currentUsage}
                  planName={planName}
                  therapistPatientCounts={therapistPatientCounts}
                />
              </TabsContent>

              <TabsContent value="clinics" className="mt-0 outline-none">
                <ClinicsSection
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

              {canEdit && (
                <TabsContent value="invitations" className="mt-0 outline-none">
                  <InvitationsSection
                    organizationId={organizationId!}
                    onInviteClick={() => setIsInviteDialogOpen(true)}
                  />
                </TabsContent>
              )}
            </div>
          </div>
        </Tabs>

        {/* Dialogs */}
        {organizationId && (
          <InviteMemberDialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
            organizationId={organizationId}
            organizationName={organization?.name}
            onSuccess={() => refetchMembers()}
          />
        )}

        {organizationId && (
          <ClinicDialog
            open={isClinicDialogOpen}
            onOpenChange={handleCloseClinicDialog}
            clinic={editingClinic}
            organizationId={organizationId}
            onSuccess={() => refetchClinics()}
          />
        )}

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
    </AccessGuard>
  );
}
