'use client';

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  readonly onSend: (text: string) => void;
  readonly disabled?: boolean;
  readonly large?: boolean;
}

const MAX_HEIGHT_PX = 180;

export function ChatComposer({ onSend, disabled = false, large = false }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  const submit = () => {
    if (disabled || !value.trim()) return;
    onSend(value);
    setValue('');
    requestAnimationFrame(resize);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
    if (event.key === 'Escape') {
      setValue('');
      requestAnimationFrame(resize);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-end gap-2 border border-separator bg-card shadow-raised transition-colors focus-within:border-tint',
        large ? 'rounded-[28px] py-3 pl-5 pr-3' : 'rounded-[24px] py-2 pl-4 pr-2'
      )}
    >
      <label htmlFor="chat-composer-input" className="sr-only">
        Napisz do asystenta
      </label>
      <textarea
        id="chat-composer-input"
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Napisz, co zrobić: przypisz zestaw, znajdź ćwiczenia, dodaj pacjenta"
        data-testid="common-chat-composer-input"
        className={cn(
          'flex-1 resize-none bg-transparent text-[16px] leading-6 text-foreground placeholder:text-label-tertiary focus:outline-none',
          large ? 'min-h-[52px] py-1' : 'min-h-7 py-1'
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label="Wyślij wiadomość"
        data-testid="common-chat-composer-send-btn"
        className="shrink-0"
      >
        <ArrowUp aria-hidden="true" />
      </Button>
    </form>
  );
}
