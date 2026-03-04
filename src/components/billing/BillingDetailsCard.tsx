'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Building2, MapPin, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { GET_BILLING_DETAILS_QUERY } from '@/graphql/queries';
import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';
import type { GetBillingDetailsResponse, OrganizationByIdResponse } from '@/types/apollo';
import { BillingDetailsDialog } from './BillingDetailsDialog';
import { isFeatureEnabled } from '@/lib/featureFlags';

// ========================================
// Types
// ========================================

interface BillingDetailsCardProps {
  readonly organizationId?: string;
  readonly className?: string;
}

// ========================================
// Component
// ========================================

export function BillingDetailsCard({ organizationId, className }: Readonly<BillingDetailsCardProps>) {
  const isBillingDetailsApiEnabled = isFeatureEnabled('BILLING_DETAILS_API');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, loading, error } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  const { data: billingData, loading: billingLoading, refetch: refetchBillingDetails } = useQuery<GetBillingDetailsResponse>(
    GET_BILLING_DETAILS_QUERY,
    {
      variables: { organizationId: organizationId || '' },
      skip: !organizationId || !isBillingDetailsApiEnabled,
      errorPolicy: 'ignore', // zmiana na ignore, zeby brak pola na backendzie nie wysypywal UI
      fetchPolicy: 'cache-and-network',
    }
  );

  const organization = (data as OrganizationByIdResponse)?.organizationById;
  const billingDetails = billingData?.billingDetails;
  const hasBillingDetails = isBillingDetailsApiEnabled && Boolean(billingDetails?.isComplete);
  const completeBillingDetails = hasBillingDetails && billingDetails ? billingDetails : null;

  const formatNip = (rawNip: string) => {
    const normalizedNip = rawNip.replaceAll(/\D/g, '');
    if (normalizedNip.length !== 10) return rawNip;
    return `${normalizedNip.slice(0, 3)}-${normalizedNip.slice(3, 6)}-${normalizedNip.slice(6, 8)}-${normalizedNip.slice(8)}`;
  };

  const maskIban = (rawIban: string) => {
    const normalizedIban = rawIban.replaceAll(/\s/g, '').toUpperCase();
    if (normalizedIban.length < 8) return normalizedIban;
    return `${normalizedIban.slice(0, 4)} **** **** **** **** ${normalizedIban.slice(-4)}`;
  };

  if (loading || (isBillingDetailsApiEnabled && billingLoading)) {
    return (
      <Card
        className={cn('border-border/40 bg-surface/50 backdrop-blur-sm', className)}
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

  if (error || !organization) {
    return (
      <Card
        className={cn('border-border/40 bg-surface/50 backdrop-blur-sm', className)}
        data-testid="billing-details-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dane do faktury</p>
              <p className="text-xs text-muted-foreground/70">Nie udało się pobrać danych</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn('border-border/40 bg-surface/50 backdrop-blur-sm', className)}
        data-testid="billing-details-card"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-xl">
                <AvatarImage src={organization.logoUrl} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-linear-to-br from-primary to-primary-dark text-white text-lg font-bold">
                  {organization.name?.[0] || 'F'}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-sm font-semibold text-foreground">{billingDetails?.companyName || organization.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {completeBillingDetails ? `NIP: ${formatNip(completeBillingDetails.nip)}` : organization.contactEmail || 'Brak danych rozliczeniowych'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              data-testid="billing-details-edit-btn"
              onClick={() => setIsDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {completeBillingDetails ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {completeBillingDetails.address}, {completeBillingDetails.postalCode} {completeBillingDetails.city}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">IBAN: {maskIban(completeBillingDetails.iban)}</p>
              <p className="text-xs text-muted-foreground">Email: {completeBillingDetails.billingEmail}</p>
            </div>
          ) : (
            <>
              {isBillingDetailsApiEnabled ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsDialogOpen(true)}
                  data-testid="billing-details-add-btn"
                >
                  Uzupełnij dane
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Konfiguracja danych do faktury jest chwilowo niedostępna na tym środowisku.
                </p>
              )}
            </>
          )}

          <div className="h-px bg-border/40 my-3" />
          <p className="text-xs text-muted-foreground/70">Dane widoczne na fakturach VAT</p>
        </CardContent>
      </Card>

      {isBillingDetailsApiEnabled && (
        <BillingDetailsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          organizationId={organizationId}
          onSaved={() => {
            refetchBillingDetails();
          }}
        />
      )}
    </>
  );
}
