"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  History,
  ArrowDownRight,
  ArrowUpRight,
  User,
  Calendar,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GET_REVENUE_HISTORY_QUERY } from "@/graphql/queries";
import type { GetRevenueHistoryResponse } from "@/types/apollo";
import type { RevenueTransaction, RevenueTransactionType } from "@/types/revenue.types";
import { formatCurrency, formatPercent } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface RevenueHistoryTableProps {
  organizationId?: string;
  className?: string;
}

type FilterType = "all" | RevenueTransactionType;

// ========================================
// Helper Components
// ========================================

function TransactionTypeBadge({ type }: { type: RevenueTransactionType }) {
  switch (type) {
    case "PatientPayment":
      return (
        <Badge variant="outline" className="text-xs border-info/30 text-info">
          <ArrowDownRight className="h-3 w-3 mr-1" />
          Płatność
        </Badge>
      );
    case "Commission":
      return (
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Prowizja
        </Badge>
      );
    case "Payout":
      return (
        <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-500">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Wypłata
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function TransactionRow({ transaction }: { transaction: RevenueTransaction }) {
  const isPositive = transaction.type === "Commission" || transaction.type === "Payout";

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-border/60 transition-colors"
      data-testid={`transaction-row-${transaction.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Patient avatar or icon */}
        {transaction.patientUser ? (
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={transaction.patientUser.image ?? undefined}
              alt={transaction.patientUser.fullname}
            />
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {transaction.patientUser.fullname?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {transaction.description ||
              transaction.patientUser?.fullname ||
              "Transakcja"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(transaction.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {transaction.commissionRate > 0 && transaction.type === "PatientPayment" && (
              <>
                <span className="text-border">•</span>
                <span>{formatPercent(transaction.commissionRate)} prowizji</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amount & Type */}
      <div className="flex items-center gap-3 shrink-0">
        <TransactionTypeBadge type={transaction.type} />
        <p
          className={cn(
            "text-sm font-bold tabular-nums",
            isPositive ? "text-emerald-500" : "text-foreground"
          )}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(
            transaction.type === "Commission"
              ? (transaction.commissionAmount || transaction.netAmount)
              : transaction.netAmount,
            transaction.currency
          )}
        </p>
      </div>
    </div>
  );
}

// ========================================
// Component
// ========================================

export function RevenueHistoryTable({
  organizationId,
  className,
}: RevenueHistoryTableProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAll, setShowAll] = useState(false);

  // Fetch revenue history
  const { data, loading, error } = useQuery<GetRevenueHistoryResponse>(
    GET_REVENUE_HISTORY_QUERY,
    {
      variables: {
        organizationId: organizationId || "",
        limit: 50,
        type: filter === "all" ? null : filter,
      },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const transactions = data?.revenueHistory || [];
  const displayedTransactions = showAll ? transactions : transactions.slice(0, 10);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Filter options
  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "Wszystkie" },
    { value: "Commission", label: "Prowizje" },
    { value: "PatientPayment", label: "Płatności" },
    { value: "Payout", label: "Wypłaty" },
  ];

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Historia Transakcji
          </CardTitle>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {filterOptions.find((f) => f.value === filter)?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(filter === option.value && "bg-primary/10")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">
              Nie udało się pobrać historii transakcji
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Brak transakcji
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "all"
                ? "Historia transakcji pojawi się tutaj, gdy pacjenci zaczną płacić za subskrypcje."
                : "Brak transakcji tego typu."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}

            {/* Show more button */}
            {transactions.length > 10 && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full mt-2"
              >
                Pokaż więcej ({transactions.length - 10} ukrytych)
              </Button>
            )}

            {showAll && transactions.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(false)}
                className="w-full mt-2"
              >
                Pokaż mniej
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
