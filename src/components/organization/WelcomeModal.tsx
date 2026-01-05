"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Users,
  FolderOpen,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface WelcomeModalProps {
  organizationName: string;
  organizationLogo?: string | null;
  invitedByName?: string | null;
  invitedByImage?: string | null;
  role: string;
  onClose?: () => void;
  autoRedirectDelay?: number; // ms, default 0 (no auto redirect)
}

// ========================================
// Helpers
// ========================================

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  THERAPIST: "Fizjoterapeuta",
  MEMBER: "Członek",
  STAFF: "Personel",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ========================================
// Quick Tips Data
// ========================================

const quickTips = [
  {
    icon: Dumbbell,
    title: "Ćwiczenia",
    description: "Twórz i zarządzaj biblioteką ćwiczeń",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Users,
    title: "Pacjenci",
    description: "Dodawaj pacjentów i przypisuj plany",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  {
    icon: FolderOpen,
    title: "Zestawy",
    description: "Grupuj ćwiczenia w gotowe programy",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
];

// ========================================
// Component
// ========================================

export function WelcomeModal({
  organizationName,
  organizationLogo,
  invitedByName,
  invitedByImage,
  role,
  onClose,
  autoRedirectDelay = 0,
}: WelcomeModalProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleContinue = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
      router.push("/");
    }, 300);
  }, [onClose, router]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto redirect if specified
  useEffect(() => {
    if (autoRedirectDelay > 0) {
      const timer = setTimeout(() => {
        handleContinue();
      }, autoRedirectDelay);
      return () => clearTimeout(timer);
    }
  }, [autoRedirectDelay, handleContinue]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "transition-all duration-300",
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default",
          "transition-opacity duration-300",
          isVisible && !isExiting ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
        aria-label="Zamknij modal"
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl border border-border/60 bg-surface overflow-hidden",
          "transition-all duration-500 ease-out",
          isVisible && !isExiting
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-light transition-colors z-10"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Gradient header */}
        <div className="relative h-32 bg-gradient-to-br from-primary via-primary to-emerald-600 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

          {/* Sparkles */}
          <Sparkles className="absolute top-4 left-6 h-6 w-6 text-white/40 animate-pulse" />
          <Sparkles className="absolute bottom-6 right-12 h-4 w-4 text-white/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>

        {/* Organization avatar - overlapping header */}
        <div className="relative -mt-12 flex justify-center">
          <div
            className={cn(
              "transition-all duration-700 delay-200",
              isVisible && !isExiting
                ? "opacity-100 scale-100"
                : "opacity-0 scale-50"
            )}
          >
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={organizationName}
                className="h-24 w-24 rounded-2xl border-4 border-surface shadow-xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-surface bg-gradient-to-br from-primary to-primary-dark text-white text-2xl font-bold shadow-xl">
                {getInitials(organizationName)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 text-center">
          {/* Welcome text */}
          <div
            className={cn(
              "transition-all duration-500 delay-300",
              isVisible && !isExiting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Witaj w {organizationName}!
            </h1>

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-muted-foreground">Dołączyłeś jako</span>
              <Badge variant="outline" className="text-primary border-primary/30">
                {roleLabels[role.toUpperCase()] || role}
              </Badge>
            </div>
          </div>

          {/* Invited by */}
          {invitedByName && (
            <div
              className={cn(
                "flex items-center justify-center gap-3 mb-6 p-3 rounded-xl bg-surface-light",
                "transition-all duration-500 delay-400",
                isVisible && !isExiting
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={invitedByImage ?? undefined} alt={invitedByName} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(invitedByName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{invitedByName}</p>
                <p className="text-xs text-muted-foreground">zaprosił(a) Cię do zespołu</p>
              </div>
            </div>
          )}

          {/* Quick tips */}
          <div
            className={cn(
              "grid grid-cols-3 gap-3 mb-6",
              "transition-all duration-500 delay-500",
              isVisible && !isExiting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            {quickTips.map((tip, index) => (
              <div
                key={tip.title}
                className="flex flex-col items-center p-3 rounded-xl bg-surface-light hover:bg-surface-hover transition-colors"
                style={{ transitionDelay: `${600 + index * 100}ms` }}
              >
                <div className={cn("p-2 rounded-lg mb-2", tip.bgColor)}>
                  <tip.icon className={cn("h-5 w-5", tip.color)} />
                </div>
                <span className="text-xs font-medium text-foreground">{tip.title}</span>
                <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                  {tip.description}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div
            className={cn(
              "transition-all duration-500 delay-700",
              isVisible && !isExiting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Button
              onClick={handleContinue}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary-dark hover:to-emerald-700 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              Zaczynamy!
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
