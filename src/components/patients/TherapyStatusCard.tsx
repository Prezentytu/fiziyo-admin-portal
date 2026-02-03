"use client";

import { TrendingUp, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TherapyStatus, TherapyStatusResult } from "@/lib/therapyStatus";

interface TherapyStatusCardProps {
  statusResult: TherapyStatusResult;
  lastActivityLabel?: string;
  className?: string;
}

const statusConfig: Record<TherapyStatus, {
  borderColor: string;
  bgColor: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  Icon: typeof TrendingUp;
}> = {
  success: {
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/5",
    iconBg: "bg-green-500/10",
    iconBorder: "border-green-500/20",
    iconColor: "text-green-500",
    badgeBg: "bg-green-500/20",
    badgeText: "text-green-400",
    badgeLabel: "W NORMIE",
    Icon: TrendingUp,
  },
  warning: {
    borderColor: "border-yellow-500/30",
    bgColor: "bg-yellow-500/5",
    iconBg: "bg-yellow-500/10",
    iconBorder: "border-yellow-500/20",
    iconColor: "text-yellow-500",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-400",
    badgeLabel: "UWAGA",
    Icon: AlertTriangle,
  },
  alert: {
    borderColor: "border-red-500/30",
    bgColor: "bg-red-500/5",
    iconBg: "bg-red-500/10",
    iconBorder: "border-red-500/20",
    iconColor: "text-red-500",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-400",
    badgeLabel: "ALARM",
    Icon: AlertCircle,
  },
};

export function TherapyStatusCard({ statusResult, lastActivityLabel, className }: TherapyStatusCardProps) {
  const config = statusConfig[statusResult.status];
  const { Icon } = config;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-zinc-900/50 p-6",
        config.borderColor,
        className
      )}
    >
      {/* Background glow */}
      <div className={cn("absolute inset-0 pointer-events-none", config.bgColor)} />
      
      <div className="relative flex items-start gap-5">
        {/* Status icon - smaller */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
            config.iconBg,
            config.iconBorder
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
              Status Terapii
            </h3>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              config.badgeBg,
              config.badgeText
            )}>
              {config.badgeLabel}
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {statusResult.title}
            {lastActivityLabel && (
              <span className="text-lg font-normal text-zinc-400 ml-2">
                (Ostatnio: {lastActivityLabel})
              </span>
            )}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {statusResult.description}
          </p>
        </div>
      </div>
    </div>
  );
}
