'use client';

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { ArrowUp, Check, Mic, Paperclip, Square, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { DOCUMENT_ACCEPT } from './useDocumentAnalysis';
import { useMicLevels } from './useMicLevels';
import { WAVE_BARS } from './utils/micLevels';

export interface ChatComposerHandle {
  /** Puts text in the field (edit of an earlier question) and focuses it, caret at the end. */
  setDraft: (text: string) => void;
  focus: () => void;
}

interface ChatComposerProps {
  readonly ref?: Ref<ChatComposerHandle>;
  readonly onSend: (text: string) => void;
  readonly onAttach: (file: File) => void;
  /** Stops the reply in flight; while busy the send button turns into stop. */
  readonly onStop?: () => void;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly large?: boolean;
  /** ArrowUp in an empty field brings back the last question, like a terminal. */
  readonly lastUserText?: string;
}

const MAX_HEIGHT_PX = 220;
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
  'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-label-secondary transition-[background-color,color,transform] duration-150 hover:bg-fill-quaternary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px]';

function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Live microphone wave, newest bar on the right (Claude's dictation look). */
function DictationWave({ levels }: { readonly levels: readonly number[] }) {
  const padded = [...Array.from({ length: Math.max(0, WAVE_BARS - levels.length) }, () => 0.04), ...levels];
  return (
    <span className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden" aria-hidden="true">
      {padded.map((level, index) => (
        <span
          key={index}
          className="w-[3px] shrink-0 rounded-full bg-foreground/70 transition-[height] duration-75"
          style={{ height: `${Math.max(3, Math.round(level * 28))}px` }}
        />
      ))}
    </span>
  );
}

/**
 * The one input of the chat (design "Czat v2"): text, a document (clip, paste) or dictation (mic).
 * Enter sends, Shift+Enter breaks the line, Escape stops dictation or clears; dictation only fills
 * the field, never sends.
 */
export function ChatComposer({
  ref,
  onSend,
  onAttach,
  onStop,
  busy = false,
  disabled = false,
  large = false,
  lastUserText,
}: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const [listenSeconds, setListenSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dictationBaseRef = useRef('');
  const dictationCancelledRef = useRef(false);

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  const placeCaretAtEnd = () =>
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      resize();
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });

  useImperativeHandle(ref, () => ({
    setDraft: (text) => {
      setValue(text);
      placeCaretAtEnd();
    },
    focus: () => textareaRef.current?.focus(),
  }));

  const voice = useVoiceInput({
    language: 'pl-PL',
    autoSend: false,
    onTranscript: (transcript) => {
      if (dictationCancelledRef.current) return;
      const base = dictationBaseRef.current;
      setValue(base ? `${base} ${transcript.trim()}` : transcript.trim());
      requestAnimationFrame(resize);
    },
  });
  const isListening = voice.state === 'listening';
  const levels = useMicLevels(isListening);

  useEffect(() => {
    if (!large || value || isListening) return;
    const interval = window.setInterval(
      () => setTipIndex((index) => (index + 1) % COMPOSER_TIPS.length),
      TIP_INTERVAL_MS
    );
    return () => window.clearInterval(interval);
  }, [isListening, large, value]);

  useEffect(() => {
    if (!isListening) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setListenSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => {
      window.clearInterval(interval);
      setListenSeconds(0);
    };
  }, [isListening]);

  // A pointer device gets the caret right away, as in any chat; a touch keyboard waits for a tap.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) textareaRef.current?.focus();
  }, []);

  const canSend = !disabled && !busy && value.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    if (isListening) voice.stopListening();
    onSend(value);
    setValue('');
    requestAnimationFrame(resize);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy && onStop) {
      onStop();
      return;
    }
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === 'ArrowUp' && !value && lastUserText) {
      event.preventDefault();
      setValue(lastUserText);
      placeCaretAtEnd();
      return;
    }
    if (event.key === 'Escape') {
      if (isListening) voice.stopListening();
      if (busy && onStop) {
        onStop();
        return;
      }
      if (isListening) return;
      setValue('');
      requestAnimationFrame(resize);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = event.clipboardData.files[0];
    if (!file || disabled || busy) return;
    event.preventDefault();
    onAttach(file);
  };

  const toggleDictation = () => {
    if (!isListening) {
      dictationBaseRef.current = value.trim();
      dictationCancelledRef.current = false;
    }
    voice.toggleListening();
  };

  /** Throws away what was dictated in this take; the text typed before it stays. */
  const cancelDictation = () => {
    dictationCancelledRef.current = true;
    voice.stopListening();
    setValue(dictationBaseRef.current);
    placeCaretAtEnd();
  };

  const placeholder = isListening ? 'Słucham…' : large ? COMPOSER_TIPS[tipIndex] : 'Napisz albo podyktuj, co zrobić';
  const showStop = busy && Boolean(onStop);
  // Words still being recognised read in place of the placeholder while the field is empty.
  const interimOverlay = isListening && Boolean(voice.interimTranscript) && !value;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="common-chat-composer"
      className={cn(
        'group/composer relative flex cursor-text flex-col gap-1 border-[0.5px] border-separator bg-card shadow-raised transition-[border-color,box-shadow] duration-200',
        'focus-within:border-tint/35 focus-within:shadow-[0_0_0_4px_var(--tint-muted),var(--elevation-raised)]',
        large ? 'rounded-[28px] pb-2.5 pl-5 pr-3 pt-4' : 'rounded-[24px] pb-2 pl-4 pr-2.5 pt-3'
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) textareaRef.current?.focus();
      }}
    >
      <label htmlFor="chat-composer-input" className="sr-only">
        Napisz do asystenta
      </label>
      <div className="relative">
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
          onPaste={handlePaste}
          placeholder={interimOverlay ? '' : placeholder}
          data-testid="common-chat-composer-input"
          className={cn(
            'w-full resize-none bg-transparent py-0.5 text-[16px] leading-6 text-foreground caret-tint outline-none placeholder:text-label-tertiary placeholder:transition-opacity focus:outline-none focus-visible:outline-none',
            large ? 'min-h-[52px]' : 'min-h-7'
          )}
        />
        {interimOverlay && (
          <p
            className="pointer-events-none absolute inset-x-0 top-0.5 animate-chat-rise text-[16px] leading-6 text-label-secondary"
            aria-hidden="true"
          >
            {voice.interimTranscript}
          </p>
        )}
      </div>
      {isListening && voice.interimTranscript && !interimOverlay && (
        <p className="-mt-0.5 animate-chat-rise truncate text-[16px] leading-6 text-label-tertiary" aria-hidden="true">
          {voice.interimTranscript}
        </p>
      )}
      {isListening ? (
        <div className="-ml-2 flex animate-chat-rise items-center gap-2" role="group" aria-label="Dyktowanie">
          <button
            type="button"
            data-testid="common-chat-composer-dictation-cancel-btn"
            className={ICON_BUTTON}
            onClick={cancelDictation}
            aria-label="Anuluj dyktowanie"
            title="Anuluj"
          >
            <X aria-hidden="true" />
          </button>
          <DictationWave levels={levels} />
          <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-label-secondary">
            {formatElapsed(listenSeconds)}
          </span>
          <button
            type="button"
            data-testid="common-chat-composer-mic-btn"
            onClick={toggleDictation}
            aria-pressed="true"
            aria-label="Zakończ dyktowanie"
            title="Gotowe (Esc)"
            className="inline-flex h-[34px] w-[34px] shrink-0 animate-chat-pop items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:size-[18px]"
          >
            <Check aria-hidden="true" strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <div className="-ml-2 flex items-center gap-1">
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => fileRef.current?.click()}
            disabled={disabled || busy}
            aria-label="Dodaj dokument z zaleceniami"
            title="Dodaj dokument (PDF, Excel, CSV, TXT). Możesz też go upuścić albo wkleić."
            data-testid="common-chat-composer-attach-btn"
          >
            <Paperclip aria-hidden="true" />
          </button>
          {/* The hint sits on a wrapper: a disabled button gets no hover, so its own title never shows. */}
          <span
            className="inline-flex"
            title={
              voice.isSupported ? 'Dyktuj: mów, a tekst wpisze się w pole' : 'Dyktowanie działa w Chrome, Edge i Safari'
            }
          >
            <button
              type="button"
              data-testid="common-chat-composer-mic-btn"
              className={ICON_BUTTON}
              onClick={toggleDictation}
              disabled={disabled || busy || !voice.isSupported}
              aria-pressed="false"
              aria-label={voice.isSupported ? 'Dyktuj' : 'Dyktuj (niedostępne w tej przeglądarce)'}
            >
              <Mic aria-hidden="true" />
            </button>
          </span>
          <span className="flex-1" />
          <span
            className={cn(
              'hidden select-none pr-2 text-[12px] text-label-tertiary transition-opacity duration-200 md:inline',
              value.trim() && !busy ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          >
            <kbd className="font-sans">↵</kbd> wyślij · <kbd className="font-sans">⇧↵</kbd> nowa linia
          </span>
          {showStop ? (
            <button
              type="submit"
              aria-label="Zatrzymaj odpowiedź"
              title="Zatrzymaj (Esc)"
              data-testid="common-chat-composer-stop-btn"
              className="inline-flex h-[34px] w-[34px] shrink-0 animate-chat-pop items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Wyślij wiadomość"
              data-testid="common-chat-composer-send-btn"
              className={cn(
                'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:size-[18px]',
                canSend
                  ? 'scale-100 bg-tint-fill text-on-tint hover:bg-tint-fill-hover'
                  : 'scale-95 bg-fill-tertiary text-label-tertiary'
              )}
            >
              <ArrowUp aria-hidden="true" strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}
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
      {voice.error && (
        <p role="alert" className="px-1 pb-1 text-[12px] text-status-danger">
          {voice.error}
        </p>
      )}
    </form>
  );
}
