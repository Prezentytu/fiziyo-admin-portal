'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { FeedbackButton } from '@/components/shared/FeedbackButton';
import { ChatModeToggle } from '@/features/ai-view/ChatModeToggle';
import { SupportHeaderButton } from '@/features/support/SupportHeaderButton';

import { NotificationsBell } from './NotificationsBell';

/** Top-right actions shared by the classic header and the chat top bar, so they sit in the same spot in both views. */
export function HeaderActions() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2" data-testid="nav-header-actions">
        <ChatModeToggle />

        <SupportHeaderButton />

        <NotificationsBell />

        <FeedbackButton variant="icon" />
      </div>
    </TooltipProvider>
  );
}
