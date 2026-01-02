"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();

  const avatarUrl = user?.imageUrl;
  const fullName = user?.fullName || user?.firstName || "Użytkownik";
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!isLoaded) {
    return <Skeleton className="h-9 w-9 rounded-xl" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-surface-light"
        style={{ outline: "none", boxShadow: "none" }}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="h-9 w-9 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white">
            {initials}
          </div>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
        {/* User info header */}
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {fullName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Menu items */}
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="gap-3 px-3 py-2.5 cursor-pointer focus:outline-none focus-visible:outline-none"
          style={{ outline: "none" }}
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Profil</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="gap-3 px-3 py-2.5 cursor-pointer focus:outline-none focus-visible:outline-none"
        >
          <Link href="/settings" style={{ outline: "none" }}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Ustawienia</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="gap-3 px-3 py-2.5 cursor-pointer text-error focus:text-error focus:bg-error/10 focus:outline-none focus-visible:outline-none"
          style={{ outline: "none" }}
        >
          <LogOut className="h-4 w-4" />
          <span>Wyloguj się</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}








