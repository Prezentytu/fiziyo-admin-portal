'use client';

import { useState } from 'react';
import { useAppSignOut } from '@/lib/auth/useAppSignOut';
import { Settings, HelpCircle, LogOut, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { OrganizationSwitchMenuItems } from './OrganizationSwitchMenuItems';
import { useCurrentUserDisplay } from './useCurrentUserDisplay';
import { useAccountNavigationItems } from './useNavigationItems';

// ========================================
// Types
// ========================================

interface UserProfileFooterProps {
  readonly isCollapsed: boolean;
}

// ========================================
// Helpers
// ========================================

// ========================================
// Component
// ========================================

export function UserProfileFooter({ isCollapsed }: UserProfileFooterProps) {
  const signOut = useAppSignOut();
  const [isOpen, setIsOpen] = useState(false);
  const { isLoaded, avatarUrl, email, displayName, compactDisplayName, initials } = useCurrentUserDisplay();
  const accountNavigationItems = useAccountNavigationItems();

  // Loading state
  if (!isLoaded) {
    return (
      <div className={cn('mx-3 border-t-[0.5px] border-separator', isCollapsed ? 'py-2' : 'py-3')}>
        {isCollapsed ? (
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
        ) : (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const menuContent = (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="nav-user-footer-trigger"
          aria-label={`Menu konta: ${displayName}`}
          className={cn(
            'group flex items-center rounded-2xl transition-all duration-200 cursor-pointer w-full',
            isCollapsed
              ? 'h-12 w-12 justify-center hover:bg-fill-quaternary mx-auto'
              : 'gap-3 p-2 hover:bg-fill-quaternary'
          )}
        >
          {/* Avatar */}
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-avatar text-avatar-label text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>

          {/* User Info (expanded only) */}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-foreground truncate leading-tight" title={displayName}>
                  {compactDisplayName}
                </div>
              </div>

              {/* Menu Icon - changes on hover/open */}
              <ChevronUp
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-all shrink-0',
                  isOpen ? 'opacity-100 rotate-0' : 'opacity-0 group-hover:opacity-100 -rotate-180'
                )}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isCollapsed ? 'start' : 'end'}
        side={isCollapsed ? 'right' : 'top'}
        sideOffset={8}
        className="w-72"
      >
        {/* User info header - "Zalogowany jako" */}
        <DropdownMenuLabel className="p-3 pb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Zalogowany jako</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-avatar text-avatar-label text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <OrganizationSwitchMenuItems testIdPrefix="nav-user-footer-org" onSwitch={() => setIsOpen(false)} />

        {accountNavigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild className="gap-3 px-3 py-2.5 cursor-pointer">
              <Link href={item.href} data-testid={item.testId}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.name}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuItem asChild className="gap-3 px-3 py-2.5 cursor-pointer">
          <Link href="/settings" data-testid="nav-user-footer-settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Ustawienia</span>
          </Link>
        </DropdownMenuItem>

        {/* Help / Support */}
        <DropdownMenuItem asChild className="gap-3 px-3 py-2.5 cursor-pointer">
          <a
            href="mailto:kontakt@fiziyo.pl"
            data-testid="nav-user-footer-help"
            target="_blank"
            rel="noopener noreferrer"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Pomoc / Support</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem
          onClick={() => signOut('/sign-in')}
          data-testid="nav-user-footer-logout"
          className="gap-3 px-3 py-2.5 cursor-pointer text-error focus:text-error focus:bg-error/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Wyloguj się</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Collapsed version with tooltip
  if (isCollapsed) {
    return (
      <div className="mx-3 border-t-[0.5px] border-separator py-2">
        <Tooltip open={!isOpen}>
          <TooltipTrigger asChild>
            <div>{menuContent}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="text-sm">{displayName}</div>
            <div className="text-xs text-muted-foreground">Kliknij dla opcji</div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded version
  return <div className="mx-3 border-t-[0.5px] border-separator py-3">{menuContent}</div>;
}
