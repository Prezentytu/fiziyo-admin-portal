"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLandingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Witaj w fiziYo
        </h1>
        <p className="text-muted-foreground">
          Panel administracyjny dla fizjoterapeutów i właścicieli gabinetów
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        <Button
          asChild
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
        >
          <Link href="/sign-in">
            <LogIn className="mr-2 h-5 w-5" />
            Zaloguj się
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          <Link href="/register">
            <UserPlus className="mr-2 h-5 w-5" />
            Utwórz konto
          </Link>
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Dla fizjoterapeutów:</strong>{" "}
          Twórz ćwiczenia, zarządzaj pacjentami i monitoruj postępy terapii.
        </p>
      </div>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        Kontynuując, akceptujesz nasze{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Warunki użytkowania
        </Link>{" "}
        oraz{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Politykę prywatności
        </Link>
      </p>
    </div>
  );
}








