"use client";

import { useQuery } from "@apollo/client/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { AccessGuard } from "@/components/shared/AccessGuard";
import { SubscriptionCard } from "@/components/organization/SubscriptionCard";
import { AICreditsPanel } from "@/components/settings/AICreditsPanel";
import { ResourceAddonsPanel } from "@/components/settings/ResourceAddonsPanel";
import { BillingSummaryWidget, TherapistBillingTable } from "@/components/billing";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  GET_ORGANIZATION_BY_ID_QUERY,
  GET_CURRENT_ORGANIZATION_PLAN,
} from "@/graphql/queries/organizations.queries";
import type { OrganizationByIdResponse } from "@/types/apollo";

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
      clinics?: number;
    };
  };
}

export default function BillingPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  // Get organization details
  const {
    data: orgData,
    loading: orgLoading,
    refetch: refetchOrg,
  } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  // Get subscription plan info
  const { data: planData, loading: planLoading, refetch: refetchPlan } = useQuery(GET_CURRENT_ORGANIZATION_PLAN, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const planInfo = (planData as PlanResponse)?.currentOrganizationPlan;

  const isLoading = orgLoading || planLoading;

  const handleRefresh = () => {
    refetchOrg();
    refetchPlan();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Rozliczenia</h1>
        </div>
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  return (
    <AccessGuard requiredAccess="admin" fallbackUrl="/">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Rozliczenia</h1>
          <p className="text-sm text-muted-foreground">
            Model Pay-as-you-go, kredyty AI i zarządzanie subskrypcją
          </p>
        </div>

        {/* Pay-as-you-go Billing Summary - Full Widget */}
        <BillingSummaryWidget
          variant="full"
          organizationId={organizationId}
        />

        {/* Therapist Billing Breakdown Table */}
        <TherapistBillingTable organizationId={organizationId} />

        {/* Separator */}
        <div className="border-t border-border/40" />

        {/* Main Grid - 12 columns, 7:5 ratio */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Column: Subscription Plan (col-span-7) */}
          <div className="lg:col-span-7">
            {organization && (
              <SubscriptionCard
                organizationId={organization.id}
                subscriptionPlan={planInfo?.currentPlan || organization.subscriptionPlan}
                expiresAt={planInfo?.expiresAt || organization.subscriptionExpiresAt}
                limits={planInfo?.limits}
                currentUsage={planInfo?.currentUsage}
                onUpgradeSuccess={handleRefresh}
              />
            )}
          </div>

          {/* Right Column: AI Credits + Resource Addons (col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* AI Credits - compact */}
            <AICreditsPanel compact />

            {/* Resource Addons - compact, NOT collapsible */}
            <ResourceAddonsPanel compact />
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
