"use client";

import { Users, MapPin, UserCheck, Sparkles } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SubscriptionLimits {
  maxExercises?: number;
  maxPatients?: number;
  maxTherapists?: number;
  maxClinics?: number;
}

interface CurrentUsage {
  exercises?: number;
  patients?: number;
  therapists?: number;
}

interface OrganizationQuickStatsProps {
  membersCount: number;
  clinicsCount: number;
  limits?: SubscriptionLimits;
  currentUsage?: CurrentUsage;
  subscriptionPlan?: string;
  isLoading?: boolean;
}

export function OrganizationQuickStats({
  membersCount,
  clinicsCount,
  limits,
  currentUsage,
  subscriptionPlan,
  isLoading = false,
}: OrganizationQuickStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate usage percentages
  const patientsUsage = limits?.maxPatients && currentUsage?.patients
    ? Math.round((currentUsage.patients / limits.maxPatients) * 100)
    : null;
  
  const therapistsUsage = limits?.maxTherapists && currentUsage?.therapists
    ? Math.round((currentUsage.therapists / limits.maxTherapists) * 100)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Members */}
      <StatsCard
        title="Członkowie zespołu"
        value={membersCount}
        icon={Users}
        variant="primary"
        description={
          limits?.maxTherapists
            ? `Limit: ${limits.maxTherapists} terapeutów`
            : undefined
        }
      />

      {/* Clinics */}
      <StatsCard
        title="Gabinety"
        value={clinicsCount}
        icon={MapPin}
        variant="secondary"
        description={
          limits?.maxClinics
            ? `Limit: ${limits.maxClinics} gabinetów`
            : undefined
        }
      />

      {/* Patients */}
      <StatsCard
        title="Pacjenci"
        value={currentUsage?.patients ?? 0}
        icon={UserCheck}
        variant="info"
        description={
          limits?.maxPatients
            ? `${patientsUsage}% z ${limits.maxPatients}`
            : undefined
        }
      />

      {/* Plan */}
      <StatsCard
        title="Plan subskrypcji"
        value={subscriptionPlan || "Free"}
        icon={Sparkles}
        variant="warning"
        description={
          limits?.maxExercises
            ? `${limits.maxExercises} ćwiczeń dostępnych`
            : undefined
        }
        href="/subscription"
      />
    </div>
  );
}


