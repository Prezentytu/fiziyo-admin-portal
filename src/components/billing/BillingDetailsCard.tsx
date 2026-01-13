"use client";

import { useQuery } from "@apollo/client/react";
import { Building2, MapPin, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GET_ORGANIZATION_BY_ID_QUERY } from "@/graphql/queries/organizations.queries";
import type { OrganizationByIdResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface BillingDetailsCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function BillingDetailsCard({ organizationId, className }: BillingDetailsCardProps) {
  // Fetch organization data
  const { data, loading, error } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  const organization = (data as OrganizationByIdResponse)?.organizationById;

  // Loading state - compact
  if (loading) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
        data-testid="billing-details-card"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state or no organization
  if (error || !organization) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
        data-testid="billing-details-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Dane do faktury
              </p>
              <p className="text-xs text-muted-foreground/70">
                Nie udało się pobrać danych
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock NIP - in real implementation this would come from organization.billingDetails
  const mockNIP = "PL1234567890";

  return (
    <Card
      className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
      data-testid="billing-details-card"
    >
      <CardContent className="p-4">
        {/* Header with logo and edit button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Company Logo */}
            <Avatar className="h-12 w-12 rounded-xl">
              <AvatarImage src={organization.logoUrl} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white text-lg font-bold">
                {organization.name?.[0] || "F"}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="text-sm font-semibold text-foreground">
                {organization.name}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                NIP: {mockNIP}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            data-testid="billing-details-edit-btn"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Address */}
        {organization.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              {organization.address}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border/40 my-3" />

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/70">
          Dane widoczne na fakturach VAT
        </p>
      </CardContent>
    </Card>
  );
}
