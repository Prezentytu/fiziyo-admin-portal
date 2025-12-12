"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Dumbbell } from "lucide-react";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left side - Branding & Illustration (hidden on mobile) */}
      <div className="relative hidden lg:flex lg:flex-col lg:justify-between bg-surface p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary">fiziYo</span>
        </div>

        {/* Illustration */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="relative w-full max-w-lg">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-3xl" />
            <Image
              src="/images/auth-bg.png"
              alt="Fizjoterapia"
              width={600}
              height={600}
              className="relative z-10 w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Zarządzaj praktyką fizjoterapeutyczną
          </h2>
          <p className="text-muted-foreground">
            Twórz ćwiczenia, zarządzaj pacjentami i monitoruj postępy — wszystko
            w jednym miejscu.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex min-h-screen flex-col lg:min-h-0">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 p-6 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary">fiziYo</span>
        </div>

        {/* Form content */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}


