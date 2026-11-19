'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSupportUnreadCount } from './useSupport';
import { SUPPORT_PATH, supportBadgeCount } from './utils/support';

/** Ikona Wsparcia obok dzwonka (D-W2); widoczna tylko z włączoną flagą `supportInbox`. */
export function SupportHeaderButton() {
  const count = useSupportUnreadCount();
  if (!count?.enabled) {
    return null;
  }
  const unread = supportBadgeCount(count);
  const label = unread > 0 ? `Wsparcie: ${unread} nieprzeczytane` : 'Wsparcie';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={label}
          data-testid="nav-support-btn"
        >
          <Link href={SUPPORT_PATH} data-testid="nav-support-link">
            <MessageCircle className="h-5 w-5 text-label-secondary" aria-hidden="true" />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
                data-testid="nav-support-count"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Wsparcie: rozmowy i zgłoszenia z zespołem FiziYo</TooltipContent>
    </Tooltip>
  );
}
