import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ChatMark({ className }: { readonly className: string }) {
  return (
    <span
      className={cn('relative flex shrink-0 items-center justify-center bg-tint-fill text-on-tint', className)}
      aria-hidden="true"
    >
      <Sparkles className="size-1/2" />
    </span>
  );
}
