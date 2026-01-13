"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface TherapistBillingTableProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

/**
 * Formatuje kwotę w PLN
 */
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("pl-PL")} PLN`;
}

/**
 * Generuje inicjały z imienia i nazwiska
 */
function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts.at(-1)?.[0] || ""}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ========================================
// Component
// ========================================

export function TherapistBillingTable({
  organizationId,
  className,
}: TherapistBillingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch billing status
  const { data, loading, error } = useQuery<GetCurrentBillingStatusResponse>(
    GET_CURRENT_BILLING_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const billingStatus = data?.currentBillingStatus;

  // Filter and sort therapists
  const therapists = useMemo(() => {
    if (!billingStatus?.therapistBreakdown) return [];

    let filtered = [...billingStatus.therapistBreakdown];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.therapistName?.toLowerCase().includes(query) ||
          t.therapistEmail?.toLowerCase().includes(query)
      );
    }

    // Sort by activePatientsCount (descending)
    filtered.sort((a, b) => b.activePatientsCount - a.activePatientsCount);

    return filtered;
  }, [billingStatus?.therapistBreakdown, searchQuery]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return therapists.reduce((sum, t) => sum + t.estimatedAmount, 0);
  }, [therapists]);

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm",
          className
        )}
        data-testid="billing-therapist-table"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !billingStatus) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm",
          className
        )}
        data-testid="billing-therapist-table"
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <p className="text-sm font-medium text-muted-foreground">
              Nie udało się pobrać danych
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {error?.message || "Spróbuj ponownie później"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (therapists.length === 0 && !searchQuery) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm",
          className
        )}
        data-testid="billing-therapist-table"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Podział na terapeutów
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-sm font-medium text-muted-foreground">
              Brak danych do wyświetlenia
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Żaden terapeuta nie aktywował jeszcze licencji Premium
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/60 bg-surface/50 backdrop-blur-sm",
        className
      )}
      data-testid="billing-therapist-table"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Podział na terapeutów
          </CardTitle>

          {/* Total amount badge */}
          <Badge
            variant="secondary"
            className="bg-primary/20 text-primary border-0 text-sm font-semibold self-start sm:self-auto"
          >
            Łączna należność: {formatCurrency(totalAmount)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj terapeuty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface border-border/60"
            data-testid="billing-therapist-search-input"
          />
        </div>

        {/* Table */}
        {therapists.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-sm font-medium text-muted-foreground">
              Nie znaleziono terapeutów
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Spróbuj zmienić kryteria wyszukiwania
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-light/50 hover:bg-surface-light/50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="font-semibold">Terapeuta</TableHead>
                  <TableHead className="text-center font-semibold">
                    Aktywacje
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Należność
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {therapists.map((therapist) => (
                  <TableRow
                    key={therapist.therapistId}
                    className="hover:bg-surface-light/30 transition-colors"
                    data-testid={`billing-therapist-row-${therapist.therapistId}`}
                  >
                    {/* Avatar */}
                    <TableCell>
                      <Avatar className="h-10 w-10 ring-2 ring-border/20">
                        <AvatarImage src={therapist.therapistImage} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white text-sm font-medium">
                          {getInitials(therapist.therapistName)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>

                    {/* Name & Email */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {therapist.therapistName || "Nieznany"}
                        </span>
                        {therapist.therapistEmail && (
                          <span className="text-xs text-muted-foreground">
                            {therapist.therapistEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Active Patients Count */}
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="bg-surface text-foreground font-semibold tabular-nums"
                      >
                        {therapist.activePatientsCount}
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right">
                      <span className="font-semibold text-primary tabular-nums">
                        {formatCurrency(therapist.estimatedAmount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Info note */}
        {therapists.length > 0 && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tabela pokazuje liczbę aktywnych licencji Premium wygenerowanych przez każdego terapeutę w bieżącym okresie rozliczeniowym.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
