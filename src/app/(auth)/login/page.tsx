'use client';

import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthLandingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Witaj w FiziYo</h1>
        <p className="text-muted-foreground">Panel administracyjny dla fizjoterapii</p>
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        <Button
          asChild
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
          data-testid="auth-login-btn"
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
          data-testid="auth-register-link-btn"
        >
          <Link href="/register">
            <UserPlus className="mr-2 h-5 w-5" />
            Utwórz konto
          </Link>
        </Button>
      </div>



      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        Kontynuując, akceptujesz nasze{' '}
        <Link href="/terms" className="text-primary hover:underline">
          Warunki użytkowania
        </Link>{' '}
        oraz{' '}
        <Link href="/privacy" className="text-primary hover:underline">
          Politykę prywatności
        </Link>
      </p>
    </div>
  );
}
