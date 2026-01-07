import { Loader2, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLoading?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionLoading = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="common-empty-state"
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-surface-light p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {actionLabel && onAction && (
            <Button onClick={onAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              disabled={secondaryActionLoading}
            >
              {secondaryActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
