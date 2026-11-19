'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSupportUnreadCount } from './useSupport';
import { SUPPORT_PATH, shouldShowSupportBanner } from './utils/support';

/** Pasek nad treścią, gdy zespół FiziYo prosi gabinet o odpowiedź; znika po odpowiedzi albo zamknięciu. */
export function SupportReplyBanner() {
  const pathname = usePathname();
  const count = useSupportUnreadCount();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || pathname.startsWith(SUPPORT_PATH) || !shouldShowSupportBanner(count)) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 flex shrink-0 flex-wrap items-center gap-3 rounded-card border border-tint/30 bg-tint-muted px-4 py-3 sm:flex-nowrap"
      data-testid="support-reply-banner"
    >
      <MessageCircle className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
        Zespół FiziYo prosi o odpowiedź
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild size="sm" data-testid="support-reply-banner-open">
          <Link href={SUPPORT_PATH}>Otwórz Wsparcie</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zamknij"
          onClick={() => setDismissed(true)}
          data-testid="support-reply-banner-close"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
