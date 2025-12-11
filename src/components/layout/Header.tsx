"use client";

import { Bell, Search, ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/UserMenu";

// Route name mappings
const routeNames: Record<string, string> = {
  "": "Dashboard",
  exercises: "Ćwiczenia",
  "exercise-sets": "Zestawy",
  patients: "Pacjenci",
  organization: "Organizacja",
  settings: "Ustawienia",
  tags: "Tagi",
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on dashboard
  if (segments.length === 0) return null;

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    // Check if this is an ID (UUID or similar)
    const isId = segment.match(/^[0-9a-f-]{20,}$/i);
    const label = isId ? "Szczegóły" : routeNames[segment] || segment;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link
        href="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      {/* Left side - Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      {/* Right side - Search and actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj... (Ctrl+K)"
            className="w-64 pl-9 bg-surface-light border-border focus:border-primary"
          />
        </div>

        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User */}
        <UserMenu />
      </div>
    </header>
  );
}
