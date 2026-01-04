"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

type StatsVariant = "primary" | "secondary" | "info" | "warning" | "success";
type StatsSize = "default" | "hero";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  variant?: StatsVariant;
  size?: StatsSize;
  loading?: boolean;
  description?: string;
  className?: string;
  href?: string;
  action?: {
    label: string;
    href: string;
  };
  children?: React.ReactNode;
}

const variantGradients: Record<StatsVariant, string> = {
  primary: "from-primary/8 via-transparent to-transparent",
  secondary: "from-secondary/8 via-transparent to-transparent",
  info: "from-info/8 via-transparent to-transparent",
  warning: "from-warning/8 via-transparent to-transparent",
  success: "from-primary/8 via-transparent to-transparent",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant = "primary",
  size = "default",
  loading = false,
  description,
  className,
  href,
  action,
  children,
}: StatsCardProps) {
  const isHero = size === "hero";

  const content = (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 border-border/60",
        href &&
          "cursor-pointer hover:border-border/80 hover:bg-surface-light/50",
        isHero && "h-full",
        className
      )}
    >
      {/* Subtle gradient background for hero */}
      {isHero && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-60",
            variantGradients[variant]
          )}
        />
      )}

      <CardContent
        className={cn("relative", isHero ? "p-6 h-full flex flex-col" : "p-6")}
      >
        <div
          className={cn("flex items-start justify-between", isHero && "mb-4")}
        >
          <div className="space-y-2">
            <p
              className={cn(
                "font-medium text-muted-foreground",
                isHero ? "text-base" : "text-sm"
              )}
            >
              {title}
            </p>
            {loading ? (
              <Skeleton className={cn(isHero ? "h-14 w-28" : "h-10 w-20")} />
            ) : (
              <p
                className={cn(
                  "font-bold tracking-tight text-foreground",
                  isHero ? "text-5xl" : "text-3xl"
                )}
              >
                {value}
              </p>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center rounded-xl",
              isHero ? "h-16 w-16" : "h-12 w-12",
              variant === "primary" &&
                "bg-gradient-to-br from-primary/90 to-primary-dark/90",
              variant === "secondary" &&
                "bg-gradient-to-br from-secondary/90 to-teal-600/90",
              variant === "info" &&
                "bg-gradient-to-br from-info/90 to-blue-600/90",
              variant === "warning" &&
                "bg-gradient-to-br from-warning/90 to-amber-600/90",
              variant === "success" &&
                "bg-gradient-to-br from-primary/90 to-primary-dark/90"
            )}
          >
            <Icon
              className={cn("text-white", isHero ? "h-8 w-8" : "h-6 w-6")}
            />
          </div>
        </div>

        {/* Hero card content (children) */}
        {isHero && children && <div className="flex-1 mt-2">{children}</div>}

        {/* Action button */}
        {action && (
          <div className={cn(isHero ? "mt-auto pt-4" : "mt-3")}>
            <Link href={action.href} className="group inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-0 text-sm text-primary hover:text-primary-light hover:bg-transparent"
              >
                {action.label}
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href && !action) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}














