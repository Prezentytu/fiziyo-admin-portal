import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo variant="default" size="sm" asLink href="/login" />
          <Link
            href="/login"
            data-testid="legal-back-to-login-link"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Powrót</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-surface/40 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} FiziYo. Wszelkie prawa zastrzeżone.</p>
          <nav className="flex items-center gap-4">
            <Link
              href="/terms"
              data-testid="legal-footer-terms-link"
              className="transition-colors hover:text-foreground"
            >
              Warunki użytkowania
            </Link>
            <span aria-hidden className="text-text-tertiary">
              •
            </span>
            <Link
              href="/privacy"
              data-testid="legal-footer-privacy-link"
              className="transition-colors hover:text-foreground"
            >
              Polityka prywatności
            </Link>
            <span aria-hidden className="text-text-tertiary">
              •
            </span>
            <a
              href="mailto:support@fiziyo.pl"
              data-testid="legal-footer-contact-link"
              className="transition-colors hover:text-foreground"
            >
              Kontakt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
