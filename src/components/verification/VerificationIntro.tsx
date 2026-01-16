"use client";

import { useState } from "react";
import { Library, Sparkles, ArrowRight, CheckCircle2, Loader2, CloudDownload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RepositoryScanResult {
  success: boolean;
  totalInRepository: number;
  newExercisesCount: number;
  existingCount: number;
  message: string;
}

interface VerificationIntroProps {
  userName?: string;
  scanResult: RepositoryScanResult | null;
  onScan: () => void;
  onImport: () => void;
  isScanning: boolean;
  isImporting: boolean;
  className?: string;
}

export function VerificationIntro({
  userName = "Ekspercie",
  scanResult,
  onScan,
  onImport,
  isScanning,
  isImporting,
  className,
}: VerificationIntroProps) {
  const isLoading = isScanning || isImporting;
  const hasNewExercises = scanResult?.newExercisesCount && scanResult.newExercisesCount > 0;

  const handleAction = () => {
    if (hasNewExercises) {
      onImport();
    } else {
      onScan();
    }
  };

  return (
    <div
      data-testid="verification-intro-container"
      className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] p-4 text-center max-w-2xl mx-auto",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      {/* Hero Icon */}
      <div
        data-testid="verification-intro-hero-icon"
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-6 rounded-full border border-primary/20">
          <Library className="w-14 h-14 text-primary" />
        </div>
      </div>

      {/* Header */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
        Centrum Weryfikacji FiziYo
      </h1>

      <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
        Witaj w strefie eksperta, {userName}. Twój wkład pomaga budować najwyższy standard rehabilitacji.
        Zadbajmy o to, by każde ćwiczenie było bezpieczne i skuteczne.
      </p>

      {/* Status Card - shows scan result or prompt to scan */}
      <Card
        data-testid="verification-intro-status-card"
        className={cn(
          "w-full max-w-md mb-8 border-primary/20 overflow-hidden",
          "bg-gradient-to-b from-surface to-primary/5",
          "shadow-lg shadow-primary/5"
        )}
      >
        <CardContent className="p-5">
          {scanResult ? (
            // Scan result view
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2.5 rounded-full">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-foreground">
                    {hasNewExercises ? "Nowe materiały są gotowe" : "Wszystko aktualne"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasNewExercises
                      ? `W poczekalni czeka ${scanResult.newExercisesCount} ćwiczeń wymagających oceny.`
                      : "Wszystkie ćwiczenia z repozytorium są już w bazie."}
                  </p>
                </div>
              </div>

              {/* Scan stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{scanResult.totalInRepository}</p>
                  <p className="text-[11px] text-muted-foreground">W repozytorium</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{scanResult.newExercisesCount}</p>
                  <p className="text-[11px] text-muted-foreground">Nowych</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-muted-foreground">{scanResult.existingCount}</p>
                  <p className="text-[11px] text-muted-foreground">Już w bazie</p>
                </div>
              </div>
            </div>
          ) : (
            // Initial state - prompt to scan
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-full">
                <CloudDownload className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-foreground">Sprawdź nowe materiały</h3>
                <p className="text-sm text-muted-foreground">
                  Kliknij poniżej, aby zobaczyć ile ćwiczeń czeka na weryfikację.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main CTA Button */}
      <Button
        data-testid="verification-intro-load-btn"
        size="lg"
        onClick={handleAction}
        disabled={isLoading}
        className={cn(
          "h-14 px-8 text-lg font-medium",
          "shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30",
          "transition-all duration-300 hover:-translate-y-0.5",
          "bg-gradient-to-r from-primary to-primary-dark"
        )}
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sprawdzam repozytorium...
          </>
        ) : isImporting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Ładuję ćwiczenia...
          </>
        ) : hasNewExercises ? (
          <>
            Załaduj ćwiczenia i zacznij pracę
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        ) : scanResult ? (
          <>
            <RefreshCw className="mr-2 h-5 w-5" />
            Sprawdź ponownie
          </>
        ) : (
          <>
            Sprawdź dostępne materiały
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* Reassurance */}
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>System automatycznie zapisuje Twoje postępy</span>
      </div>
    </div>
  );
}
