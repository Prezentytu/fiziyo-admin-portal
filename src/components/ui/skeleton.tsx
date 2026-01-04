import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "shimmer";
}

function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "shimmer"
          ? "animate-shimmer"
          : "animate-pulse bg-surface-light",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
