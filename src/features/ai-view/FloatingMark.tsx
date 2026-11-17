import Image from 'next/image';

import { cn } from '@/lib/utils';

/** The FiziYo mark floating gently: the assistant is working (styles in globals.css, „chat-float-mark”). */
export function FloatingMark({ className }: { readonly className?: string }) {
  return (
    <span className={cn('chat-float-mark', className)} aria-hidden="true">
      <span className="chat-float-mark__glow" />
      <span className="chat-float-mark__shadow" />
      <Image src="/images/icon.png" alt="" width={20} height={20} className="chat-float-mark__icon" />
    </span>
  );
}
