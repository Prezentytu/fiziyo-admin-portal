"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  FolderKanban,
  Users,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ćwiczenia", href: "/exercises", icon: Dumbbell },
  { name: "Zestawy", href: "/exercise-sets", icon: FolderKanban },
  { name: "Pacjenci", href: "/patients", icon: Users },
  { name: "Organizacja", href: "/organization", icon: Building2 },
  { name: "Ustawienia", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
          <span className="text-lg font-bold text-primary-foreground">F</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none">Fiziyo</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-6">
        <p className="px-3 mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Menu główne
        </p>
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-surface-light hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-full opacity-50" />
              )}
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                !active && "group-hover:scale-110"
              )} />
              <span className="flex-1">{item.name}</span>
              {active && <ChevronRight className="h-4 w-4 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => signOut()}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-error-muted hover:text-error"
        >
          <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
