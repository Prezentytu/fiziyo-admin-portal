import { cn } from '@/lib/utils';
import { ChatMark } from './ChatMark';

/** The FiziYo mark floating gently: the assistant is working (styles in globals.css, „chat-float-mark”). */
export function FloatingMark({ className }: { readonly className?: string }) {
  return (
    <span className={cn('chat-float-mark', className)} aria-hidden="true">
      <span className="chat-float-mark__glow" />
      <span className="chat-float-mark__shadow" />
      <ChatMark className="chat-float-mark__icon rounded-badge" />
    </span>
  );
}
