"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Don't redirect if user is on invite page - they need to accept the invitation
  const isInvitePage = pathname?.startsWith("/invite");

  useEffect(() => {
    if (isLoaded && isSignedIn && !isInvitePage) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router, isInvitePage]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // For invite page, allow signed-in users to see the content
  if (isSignedIn && !isInvitePage) {
    return null;
  }

  // For invite page with signed-in user, render just the children without the auth layout
  if (isSignedIn && isInvitePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left side - Branding & Illustration (hidden on mobile) */}
      <div className="relative hidden lg:flex lg:flex-col lg:justify-between bg-surface p-10">
        {/* Logo */}
        <Logo variant="default" size="lg" />

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
        <div className="p-6 lg:hidden">
          <Logo variant="default" size="lg" />
        </div>

        {/* Form content */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
