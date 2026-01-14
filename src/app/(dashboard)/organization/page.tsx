"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import {
  Building2,
  Users,
  MapPin,
  UserPlus,
  Plus,
  Mail,
  Activity,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import {
  InviteMemberDialog,
  ClinicDialog,
  AssignToClinicDialog,
  InvitationsModal,
} from "@/components/organization";
import { TeamSection } from "@/components/organization/TeamSection";
import { ClinicsSection, Clinic } from "@/components/organization/ClinicsSection";
import type { OrganizationMember } from "@/components/organization/MemberCard";
import { cn } from "@/lib/utils";

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
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
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
  const totalPatients = billingStatus?.activePatientsInMonth ?? 0;
  const avgPatientsPerTherapist = teamCount > 0 ? Math.round(totalPatients / teamCount) : 0;

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
    <div className="space-y-6">
      {/* Tabs - simplified without Settings tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground" data-testid="org-page-title">Zespół i gabinety</h1>
          <TabsList className="h-9">
            <TabsTrigger value="team" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="org-tab-team">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Zespół</span>
              <span className="text-muted-foreground">({teamCount})</span>
            </TabsTrigger>
            <TabsTrigger value="clinics" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="org-tab-clinics">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gabinety</span>
              <span className="text-muted-foreground">({clinicsCount})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Hero Action + Quick Stats */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 mt-4">
          {/* Hero Action - dynamiczny w zależności od zakładki */}
          {canEdit && (
            <button
              onClick={() => {
                if (activeTab === "clinics") {
                  setIsClinicDialogOpen(true);
                } else {
                  setIsInviteDialogOpen(true);
                }
              }}
              className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1 lg:col-span-5"
              data-testid="org-hero-action-btn"
            >
              <div className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {activeTab === "clinics" ? (
                    <MapPin className="h-5 w-5 text-white" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white">
                    {activeTab === "team" && "Zaproś do zespołu"}
                    {activeTab === "invitations" && "Nowe zaproszenie"}
                    {activeTab === "clinics" && "Dodaj gabinet"}
                  </h3>
                  <p className="text-sm text-white/70">
                    {activeTab === "team" && "Dodaj fizjoterapeutę lub administratora"}
                    {activeTab === "invitations" && "Wyślij email lub wygeneruj link"}
                    {activeTab === "clinics" && "Utwórz nową lokalizację"}
                  </p>
                </div>
                <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
              </div>
            </button>
          )}

          {/* Quick Stats - klikalne */}
          <div className={cn(
            "grid grid-cols-3 gap-3",
            canEdit ? "sm:col-span-1 lg:col-span-7" : "sm:col-span-2 lg:col-span-12"
          )}>
            {/* Team count */}
            <button
              onClick={() => setActiveTab("team")}
              className={cn(
                "rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200",
                activeTab === "team"
                  ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                  : "border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border"
              )}
              data-testid="org-stat-team"
            >
              <div className="flex items-center gap-2">
                <Users className={cn("h-4 w-4", activeTab === "team" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-2xl font-bold", activeTab === "team" ? "text-primary" : "text-foreground")}>
                  {teamCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Terapeutów</p>
            </button>

            {/* Patient load - skuteczność */}
            <button
              onClick={() => setActiveTab("team")}
              className={cn(
                "rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200",
                "border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border"
              )}
              data-testid="org-stat-patients"
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span className="text-2xl font-bold text-foreground">
                  {totalPatients}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Śr. {avgPatientsPerTherapist}/terapeutę
              </p>
            </button>

            {/* Pending invitations - opens modal */}
            {canEdit ? (
              <button
                onClick={() => setIsInvitationsModalOpen(true)}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200",
                  pendingInvitations > 0
                    ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                    : "border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border"
                )}
                data-testid="org-stat-invitations"
              >
                <div className="flex items-center gap-2">
                  <Mail className={cn("h-4 w-4", pendingInvitations > 0 ? "text-amber-500" : "text-muted-foreground")} />
                  <span className={cn("text-2xl font-bold", pendingInvitations > 0 ? "text-amber-500" : "text-foreground")}>
                    {pendingInvitations}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingInvitations === 0 ? "Wszyscy na pokładzie" : "Oczekuje"}
                </p>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("clinics")}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200",
                  activeTab === "clinics"
                    ? "border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20"
                    : "border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border"
                )}
                data-testid="org-stat-clinics"
              >
                <div className="flex items-center gap-2">
                  <MapPin className={cn("h-4 w-4", activeTab === "clinics" ? "text-secondary" : "text-muted-foreground")} />
                  <span className={cn("text-2xl font-bold", activeTab === "clinics" ? "text-secondary" : "text-foreground")}>
                    {clinicsCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gabinety</p>
              </button>
            )}
          </div>
        </div>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
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

        {/* Clinics Tab */}
        <TabsContent value="clinics" className="mt-6">
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

      {/* Invitations Modal */}
      {organizationId && canEdit && (
        <InvitationsModal
          open={isInvitationsModalOpen}
          onOpenChange={setIsInvitationsModalOpen}
          organizationId={organizationId}
          onInviteClick={() => setIsInviteDialogOpen(true)}
        />
      )}
    </div>
    </AccessGuard>
  );
}
