'use client';

import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FeedbackButton } from '@/components/shared/FeedbackButton';
import { ChatModeToggle } from '@/features/ai-view/ChatModeToggle';

/** Top-right actions shared by the classic header and the chat top bar, so they sit in the same spot in both views. */
export function HeaderActions() {
  // TODO: Replace with real notification count from backend
  const notificationCount = 0;
  const hasNotifications = notificationCount > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2" data-testid="nav-header-actions">
        <ChatModeToggle />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-testid="nav-notifications-btn"
              aria-label="Powiadomienia"
            >
              <Bell className="h-5 w-5 text-label-secondary" />
              {hasNotifications && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Powiadomienia</p>
            <p className="text-xs text-muted-foreground">Wkrótce dostępne</p>
          </TooltipContent>
        </Tooltip>

        <FeedbackButton variant="icon" />
      </div>
    </TooltipProvider>
  );
}
