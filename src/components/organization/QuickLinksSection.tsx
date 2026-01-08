"use client";

import Link from "next/link";
import { Dumbbell, FolderOpen, Users, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickLinkCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  description: string;
  color: "primary" | "secondary" | "info";
}

const colorVariants = {
  primary: {
    bg: "bg-primary/10",
    icon: "text-primary",
    hover: "hover:bg-primary/15 hover:border-primary/30",
    count: "text-primary",
  },
  secondary: {
    bg: "bg-secondary/10",
    icon: "text-secondary",
    hover: "hover:bg-secondary/15 hover:border-secondary/30",
    count: "text-secondary",
  },
  info: {
    bg: "bg-info/10",
    icon: "text-info",
    hover: "hover:bg-info/15 hover:border-info/30",
    count: "text-info",
  },
};

function QuickLinkCard({
  href,
  icon: Icon,
  label,
  count,
  description,
  color,
}: QuickLinkCardProps) {
  const colors = colorVariants[color];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-border/40 bg-surface p-4",
        "transition-all duration-200",
        colors.hover
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
          colors.bg
        )}
      >
        <Icon className={cn("h-6 w-6", colors.icon)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{label}</span>
          {count !== undefined && (
            <span className={cn("text-lg font-bold", colors.count)}>{count}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
    </Link>
  );
}

interface QuickLinksSectionProps {
  patientsCount?: number;
  exercisesCount?: number;
  setsCount?: number;
  className?: string;
}

export function QuickLinksSection({
  patientsCount,
  exercisesCount,
  setsCount,
  className,
}: QuickLinksSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        Szybki dostęp
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLinkCard
          href="/patients"
          icon={Users}
          label="Pacjenci"
          count={patientsCount}
          description="Zarządzaj pacjentami"
          color="secondary"
        />
        <QuickLinkCard
          href="/exercises"
          icon={Dumbbell}
          label="Ćwiczenia"
          count={exercisesCount}
          description="Biblioteka ćwiczeń"
          color="primary"
        />
        <QuickLinkCard
          href="/exercise-sets"
          icon={FolderOpen}
          label="Zestawy"
          count={setsCount}
          description="Zestawy ćwiczeń"
          color="info"
        />
      </div>
    </div>
  );
}



