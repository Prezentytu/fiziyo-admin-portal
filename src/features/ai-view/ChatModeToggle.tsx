'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatMode } from './useChatMode';

/** Header switch between the classic dashboard and the chat view; both live on `/`. */
export function ChatModeToggle() {
  const { preference, update } = useChatMode();
  const pathname = usePathname();
  const router = useRouter();
  const label = preference.enabled ? 'Widok klasyczny' : 'Widok czatu';

  const handleToggle = () => {
    update({ enabled: !preference.enabled });
    if (pathname !== '/') router.push('/');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          aria-label={label}
          aria-pressed={preference.enabled}
          data-testid="nav-chat-mode-toggle-btn"
        >
          {preference.enabled ? <LayoutGrid aria-hidden="true" /> : <MessageSquare aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label} (eksperymentalny czat)</TooltipContent>
    </Tooltip>
  );
}
