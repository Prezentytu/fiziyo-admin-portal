"use client";

import { FileText, Download, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface InvoicesHistoryCardProps {
  organizationId?: string; // Reserved for future backend integration
  className?: string;
}

type InvoiceStatus = "paid" | "pending" | "overdue";

interface MockInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
}

// ========================================
// Mock Data
// ========================================

const mockInvoices: MockInvoice[] = [
  {
    id: "inv-1",
    number: "FV/2025/12/001",
    date: "2025-12-01",
    amount: 585,
    status: "paid",
  },
  {
    id: "inv-2",
    number: "FV/2025/11/001",
    date: "2025-11-01",
    amount: 540,
    status: "paid",
  },
  {
    id: "inv-3",
    number: "FV/2025/10/001",
    date: "2025-10-01",
    amount: 495,
    status: "paid",
  },
];

// ========================================
// Helper Functions
// ========================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("pl-PL")} PLN`;
}

function getStatusConfig(status: InvoiceStatus): {
  label: string;
  icon: typeof CheckCircle2;
  className: string;
} {
  switch (status) {
    case "paid":
      return {
        label: "Opłacona",
        icon: CheckCircle2,
        className: "bg-primary/20 text-primary border-0",
      };
    case "pending":
      return {
        label: "Oczekuje",
        icon: Clock,
        className: "bg-warning/20 text-warning border-0",
      };
    case "overdue":
      return {
        label: "Zaległa",
        icon: AlertCircle,
        className: "bg-destructive/20 text-destructive border-0",
      };
  }
}

// ========================================
// Component
// ========================================

export function InvoicesHistoryCard({ className }: InvoicesHistoryCardProps) {
  // In real implementation, this would fetch from backend
  const invoices = mockInvoices;

  return (
    <Card
      className={cn("border-border/60 bg-surface/50 backdrop-blur-sm", className)}
      data-testid="billing-invoices-history-card"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-4.5 w-4.5 text-primary" />
          </div>
          <span>Historia faktur</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {invoices.length === 0 ? (
          <div className="text-center py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light mx-auto mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Brak faktur do wyświetlenia
            </p>
          </div>
        ) : (
          <>
            {/* Invoice List */}
            <div className="space-y-2">
              {invoices.map((invoice) => {
                const statusConfig = getStatusConfig(invoice.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={invoice.id}
                    className="group flex items-center justify-between p-3 rounded-lg bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
                    data-testid={`billing-invoice-row-${invoice.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {invoice.number}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1 text-xs", statusConfig.className)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Pobierz PDF"
                        data-testid={`billing-invoice-download-${invoice.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* See All Link */}
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="billing-invoices-see-all-btn"
            >
              <span>Zobacz wszystkie faktury</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
