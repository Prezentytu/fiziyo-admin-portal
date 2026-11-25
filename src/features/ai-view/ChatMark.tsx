import Image from 'next/image';

import { cn } from '@/lib/utils';

/** Znak asystenta: logo FiziYo, wspólne dla powitania i wskaźnika pracy. */
export function ChatMark({ className }: { readonly className: string }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center', className)} aria-hidden="true">
      <Image src="/images/icon.png" alt="" fill sizes="44px" className="object-contain" />
    </span>
  );
}
