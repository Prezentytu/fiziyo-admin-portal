'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Paperclip, Square } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { DOCUMENT_ACCEPT } from './useDocumentAnalysis';

interface ChatComposerProps {
  readonly onSend: (text: string) => void;
  readonly onAttach: (file: File) => void;
  readonly disabled?: boolean;
  readonly large?: boolean;
}

const MAX_HEIGHT_PX = 180;
const TIP_INTERVAL_MS = 4000;

/** Rotating hints on the empty composer: what one sentence can do here. */
export const COMPOSER_TIPS = [
  'Ułóż zestaw na kolano dla Kowalskiego',
  'Kto nie ćwiczy od tygodnia?',
  'Dodaj pacjentkę Anna Nowak, ból lędźwi',
  'Znajdź ćwiczenia na bark',
  'Utwórz ćwiczenie: mostek na jednej nodze',
];

const ICON_BUTTON =
  'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-label-secondary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-[18px]';

/**
 * The one input of the chat (design "Czat v2"): text, a document (clip) or dictation (mic). Enter
 * sends, Shift+Enter breaks the line, Escape clears; dictation only fills the field, never sends.
 */
export function ChatComposer({ onSend, onAttach, disabled = false, large = false }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dictationBaseRef = useRef('');

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  const voice = useVoiceInput({
    language: 'pl-PL',
    autoSend: false,
    onTranscript: (transcript) => {
      const base = dictationBaseRef.current;
      setValue(base ? `${base} ${transcript.trim()}` : transcript.trim());
      requestAnimationFrame(resize);
    },
  });
  const isListening = voice.state === 'listening';

  useEffect(() => {
    if (!large || value) return;
    const interval = window.setInterval(() => setTipIndex((index) => (index + 1) % COMPOSER_TIPS.length), TIP_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [large, value]);

  const submit = () => {
    if (disabled || !value.trim()) return;
    if (isListening) voice.stopListening();
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
      if (isListening) voice.stopListening();
      setValue('');
      requestAnimationFrame(resize);
    }
  };

  const toggleDictation = () => {
    if (!isListening) dictationBaseRef.current = value.trim();
    voice.toggleListening();
  };

  const placeholder = large ? COMPOSER_TIPS[tipIndex] : 'Napisz, co zrobić';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col gap-0.5 border border-separator bg-card shadow-raised transition-[border-color,box-shadow] focus-within:border-tint/45',
        large ? 'rounded-[28px] pb-2.5 pl-5 pr-3 pt-4' : 'rounded-[24px] pb-2 pl-4 pr-2.5 pt-3'
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
        placeholder={isListening ? 'Słucham…' : placeholder}
        data-testid="common-chat-composer-input"
        className={cn(
          'w-full resize-none bg-transparent py-0.5 text-[16px] leading-6 text-foreground placeholder:text-label-tertiary focus:outline-none',
          large ? 'min-h-[52px]' : 'min-h-7'
        )}
      />
      <div className="-ml-2 flex items-center gap-1">
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Dodaj dokument z zaleceniami"
          title="Dodaj dokument (PDF, Excel, CSV, TXT)"
          data-testid="common-chat-composer-attach-btn"
        >
          <Paperclip aria-hidden="true" />
        </button>
        {voice.isSupported && (
          <button
            type="button"
            className={cn(ICON_BUTTON, isListening && 'bg-status-danger-muted text-status-danger hover:bg-status-danger-muted hover:text-status-danger')}
            onClick={toggleDictation}
            disabled={disabled}
            aria-pressed={isListening}
            aria-label={isListening ? 'Zatrzymaj dyktowanie' : 'Dyktuj'}
            data-testid="common-chat-composer-mic-btn"
          >
            {isListening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
          </button>
        )}
        <span className="flex-1" />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Wyślij wiadomość"
          data-testid="common-chat-composer-send-btn"
          className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[background-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-fill-tertiary disabled:text-label-tertiary [&_svg]:size-[18px]"
        >
          <ArrowUp aria-hidden="true" />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="common-chat-composer-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onAttach(file);
        }}
      />
      {voice.error && <p className="px-1 pb-1 text-[12px] text-status-danger">{voice.error}</p>}
    </form>
  );
}
