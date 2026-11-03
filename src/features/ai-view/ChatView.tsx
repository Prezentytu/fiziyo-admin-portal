'use client';

import { memo, useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import {
  ArrowDown,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  FileText,
  FileUp,
  FolderPlus,
  Menu,
  Pencil,
  Sparkles,
  SquarePen,
  UserPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { InitialsAvatar } from '@/components/shared/page';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { polishPlural } from '@/utils/polishPlural';
import { ChatComposer, type ChatComposerHandle } from './ChatComposer';
import { useChatSession } from './ChatSessionContext';
import { useChatShellControls } from './ChatShellControls';
import { ChatSpecRenderer } from './catalog/ChatSpecRenderer';
import { PatientContextPanel } from './PatientContextPanel';
import { useChatShortcuts } from './useChatShortcuts';
import { useDocumentAnalysis } from './useDocumentAnalysis';
import { useStickToBottom } from './useStickToBottom';
import { useTodayAgenda } from './useTodayAgenda';
import type { ChatThreadMessage } from './utils/conversationStore';
import { nextRevealMarker, revealSegments, thinkingLabel, type RevealMarker } from './utils/replyMotion';
import { shouldTypeIntoComposer } from './utils/typeToComposer';
import { describeIssue, type AgendaIssue } from './utils/todayAgenda';
import type { DispatchFailure } from './utils/resolveReply';

const FALLBACK_NOTES: Record<DispatchFailure, string> = {
  unavailable: 'Asystent AI teraz nie odpowiada, więc ta odpowiedź jest bez AI.',
  insufficient_credits: 'Skończyły się kredyty AI, więc ta odpowiedź jest bez AI.',
  unauthorized: 'Sesja wygasła, więc ta odpowiedź jest bez AI. Odśwież stronę, żeby wrócić do AI.',
};

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5 || hour >= 18) return 'Dobry wieczór';
  return 'Dzień dobry';
}

const COPIED_MS = 1600;

/** Copy to clipboard with a short check mark in place of the icon, as in Claude. */
function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    });
  }, []);
  return [copied, copy];
}

const ACTION_BUTTON =
  'inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-label-tertiary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[15px]';

/** A fresh reply reads in word by word; history and restored conversations show at once. */
function RevealText({ text, animate }: { readonly text: string; readonly animate: boolean }) {
  if (!animate) return <>{text}</>;
  return (
    <>
      {revealSegments(text).map((segment, index) => (
        <span key={index} className="chat-word" style={{ animationDelay: `${segment.delayMs}ms` }}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

// Memoized: a new message leaves the cards above it alone (a spent card keeps its message object).
const AssistantMessage = memo(function AssistantMessage({
  message,
  animate,
}: {
  readonly message: Extract<ChatThreadMessage, { role: 'assistant' }>;
  readonly animate: boolean;
}) {
  const [copied, copy] = useCopy();
  return (
    <div className="group/message flex min-w-0 flex-1 flex-col gap-3.5">
      {message.text && (
        <p className="whitespace-pre-wrap break-words text-[16px] leading-[26px] text-foreground">
          <RevealText text={message.text} animate={animate} />
        </p>
      )}
      {message.spec && (
        <div className={cn(animate && message.text && 'animate-chat-rise [animation-delay:180ms]')}>
          <ChatSpecRenderer
            spec={message.spec}
            testId={`common-chat-reply-${message.id}`}
            messageId={message.id}
            chosen={message.chosen}
          />
        </div>
      )}
      {(message.text || message.fallbackReason || message.creditsUsed > 0) && (
        <div className="-mt-1.5 flex min-h-7 items-center gap-1">
          {message.fallbackReason ? (
            <p className="text-[12px] text-label-tertiary">{FALLBACK_NOTES[message.fallbackReason]}</p>
          ) : message.creditsUsed > 0 ? (
            <p className="text-[12px] tabular-nums text-label-tertiary">
              −{message.creditsUsed} {polishPlural(message.creditsUsed, 'kredyt', 'kredyty', 'kredytów')} AI
            </p>
          ) : null}
          {message.text && (
            <button
              type="button"
              onClick={() => copy(message.text ?? '')}
              aria-label={copied ? 'Skopiowano' : 'Kopiuj odpowiedź'}
              title={copied ? 'Skopiowano' : 'Kopiuj'}
              data-testid={`common-chat-reply-${message.id}-copy-btn`}
              className={cn(ACTION_BUTTON, 'opacity-0 group-hover/message:opacity-100', copied && 'opacity-100')}
            >
              {copied ? <Check className="text-tint" aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function UserMessage({
  message,
  onEdit,
}: {
  readonly message: Extract<ChatThreadMessage, { role: 'user' }>;
  readonly onEdit: (text: string) => void;
}) {
  const [copied, copy] = useCopy();
  return (
    <div className="group/message relative flex max-w-[min(80%,560px)] flex-col items-end gap-1.5">
      {message.attachmentName && (
        <span className="inline-flex items-center gap-2 rounded-[12px] border-[0.5px] border-hairline bg-card px-2.5 py-1.5 text-[14px] font-medium text-foreground">
          <FileText className="h-4 w-4 text-label-secondary" aria-hidden="true" />
          {message.attachmentName}
        </span>
      )}
      <p className="whitespace-pre-wrap break-words rounded-[22px] bg-fill-tertiary px-4 py-2.5 text-[16px] leading-6 text-foreground">
        {message.text}
      </p>
      <div
        className={cn(
          'absolute right-0 top-full mt-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100',
          copied && 'opacity-100'
        )}
      >
        <button
          type="button"
          onClick={() => onEdit(message.text)}
          aria-label="Edytuj i wyślij ponownie"
          title="Edytuj"
          data-testid={`common-chat-message-${message.id}-edit-btn`}
          className={ACTION_BUTTON}
        >
          <Pencil aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => copy(message.text)}
          aria-label={copied ? 'Skopiowano' : 'Kopiuj wiadomość'}
          title={copied ? 'Skopiowano' : 'Kopiuj'}
          data-testid={`common-chat-message-${message.id}-copy-btn`}
          className={ACTION_BUTTON}
        >
          {copied ? <Check className="text-tint" aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/** The busy line: a turning spark and a status that moves on while the wait grows. */
function ThinkingLine({ isDocument }: { readonly isDocument: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 400);
    return () => window.clearInterval(interval);
  }, []);
  const label = thinkingLabel(elapsedMs, isDocument);
  return (
    <li
      className="flex animate-chat-rise items-center gap-2.5 text-[15px]"
      data-testid="common-chat-thinking"
      role="status"
    >
      <Sparkles className="h-[18px] w-[18px] animate-spin text-tint [animation-duration:2.4s]" aria-hidden="true" />
      <span key={label} className="text-chat-shimmer animate-chat-rise">
        {label}
      </span>
    </li>
  );
}

/** Follows new messages only while the therapist is at the bottom; otherwise offers a jump back. */
function TodayAgenda() {
  const { visits, issues } = useTodayAgenda();
  const { appendExchange } = useChatSession();
  const [isOpen, setIsOpen] = useState(false);
  if (visits.length === 0 && issues.length === 0) return null;

  const openIssue = (issue: AgendaIssue) => {
    if (issue.kind === 'inactive') {
      appendExchange('Kto nie ćwiczy?', {
        text: 'Ci pacjenci ostatnio nie ćwiczą. Możesz im przypomnieć jednym kliknięciem.',
        spec: { component: 'PatientPeek', filter: 'inactive' },
      });
      return;
    }
    appendExchange(`Plan wygasa: ${issue.name}`, {
      text: `${describeIssue(issue)}. Możesz ułożyć kolejny zestaw.`,
      spec: { component: 'PatientPeek', patientId: issue.patientId },
    });
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        data-testid="common-chat-today-btn"
        className="inline-flex h-[34px] items-center gap-2.5 rounded-full pl-3 pr-1.5 text-[14px] text-label-secondary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          Dziś <b className="font-semibold text-foreground">{visits.length}</b>{' '}
          {polishPlural(visits.length, 'wizyta', 'wizyty', 'wizyt')}
        </span>
        <span className="h-[3px] w-[3px] rounded-full bg-label-tertiary" aria-hidden="true" />
        <span>
          <b className="font-semibold text-foreground">{issues.length}</b>{' '}
          {polishPlural(issues.length, 'sprawa', 'sprawy', 'spraw')}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>
      {isOpen && (
        <ul
          data-testid="common-chat-today-list"
          className="w-full animate-chat-rise rounded-[18px] border-[0.5px] border-separator px-4 py-1"
        >
          {visits.map((visit) => (
            <li
              key={`visit-${visit.patientId}-${visit.time}`}
              className="border-t-[0.5px] border-hairline first:border-t-0"
            >
              <button
                type="button"
                onClick={() =>
                  appendExchange(`Wizyta: ${visit.name}`, {
                    text: `Wizyta o ${visit.time}. Tak wygląda teraz plan.`,
                    spec: { component: 'PatientPeek', patientId: visit.patientId },
                  })
                }
                data-testid={`common-chat-today-visit-${visit.patientId}-btn`}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-11 shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
                  {visit.time}
                </span>
                <CalendarDays className="h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] font-medium text-foreground">{visit.name}</b>
                  {visit.title && (
                    <span className="block truncate text-[13px] text-label-secondary">{visit.title}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {issues.map((issue) => (
            <li key={`${issue.kind}-${issue.patientId}`} className="border-t-[0.5px] border-hairline first:border-t-0">
              <button
                type="button"
                onClick={() => openIssue(issue)}
                data-testid={`common-chat-today-${issue.kind}-${issue.patientId}-btn`}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'ml-[18px] mr-[22px] h-[7px] w-[7px] shrink-0 rounded-full',
                    issue.kind === 'inactive' ? 'bg-status-warning' : 'bg-status-info'
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] font-medium text-foreground">{issue.name}</b>
                  <span className="block truncate text-[13px] text-label-secondary">{describeIssue(issue)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatHome({
  composerRef,
  onSend,
  onAttach,
}: {
  readonly composerRef: RefObject<ChatComposerHandle | null>;
  readonly onSend: (text: string) => void;
  readonly onAttach: (file: File) => void;
}) {
  const { firstName, isBusy, isReady } = useChatSession();
  const shortcuts = useChatShortcuts();
  const [now] = useState(() => new Date());

  return (
    <div className="flex flex-col gap-7 [&>*]:animate-chat-rise [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms]">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="chat-breathe relative flex h-11 w-11 items-center justify-center rounded-[14px] bg-tint-fill text-on-tint">
          <Sparkles className="h-[22px] w-[22px]" aria-hidden="true" />
        </span>
        <h1 className="text-[26px] font-bold leading-8 tracking-tight text-foreground sm:text-[32px] sm:leading-[38px]">
          {firstName ? `${greeting(now)}, ${firstName}` : greeting(now)}
        </h1>
        <p className="text-[16px] text-label-secondary">W czym pomóc między wizytami?</p>
      </div>
      <ChatComposer ref={composerRef} onSend={onSend} onAttach={onAttach} busy={isBusy} disabled={!isReady} large />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Skróty">
          <ChoiceChip onClick={shortcuts.createSet} disabled={!isReady} data-testid="common-chat-shortcut-set-btn">
            <FolderPlus aria-hidden="true" />
            Utwórz zestaw
          </ChoiceChip>
          <ChoiceChip onClick={shortcuts.addPatient} disabled={!isReady} data-testid="common-chat-shortcut-patient-btn">
            <UserPlus aria-hidden="true" />
            Dodaj pacjenta
          </ChoiceChip>
          <ChoiceChip onClick={shortcuts.scanVisit} disabled={!isReady} data-testid="common-chat-shortcut-scan-btn">
            <FileText aria-hidden="true" />
            Skanuj wizytę
          </ChoiceChip>
        </div>
        <TodayAgenda />
      </div>
    </div>
  );
}

function TopBar() {
  const { title, messages, useAi, setUseAi, contextPatient, isContextOpen, setContextOpen, startConversation } =
    useChatSession();
  const { isSidebarCollapsed, openMobileSidebar, toggleSidebar } = useChatShellControls();
  const isEmpty = messages.length === 0;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 pl-3 pr-4 lg:pr-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={openMobileSidebar}
        aria-label="Otwórz menu"
        className="lg:hidden"
        data-testid="common-chat-menu-btn"
      >
        <Menu aria-hidden="true" />
      </Button>
      {isSidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Pokaż menu"
          className="hidden lg:inline-flex"
          data-testid="common-chat-sidebar-expand-btn"
        >
          <Menu aria-hidden="true" />
        </Button>
      )}
      <h2 className="min-w-0 truncate text-[15px] font-semibold text-foreground">{isEmpty ? '' : title}</h2>
      <span className="flex-1" />
      <button
        type="button"
        onClick={() => setUseAi(!useAi)}
        aria-pressed={useAi}
        data-testid="common-chat-ai-toggle-btn"
        title={useAi ? 'Wyłącz AI: odpowiedzi tylko z reguł, nic nie wychodzi do modelu' : 'Włącz asystenta AI'}
        className={cn(
          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          useAi ? 'bg-tint-muted text-tint' : 'bg-fill-tertiary text-label-secondary'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {useAi ? 'AI' : 'Bez AI'}
      </button>
      {contextPatient && (
        <button
          type="button"
          aria-pressed={isContextOpen}
          onClick={() => setContextOpen(!isContextOpen)}
          data-testid="common-chat-context-chip-btn"
          className={cn(
            'inline-flex h-[34px] min-w-0 max-w-[220px] shrink items-center gap-2 rounded-full border-[0.5px] pl-1 pr-3 text-[13px] font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isContextOpen ? 'border-transparent bg-fill-tertiary' : 'border-hairline bg-card hover:bg-fill-quaternary'
          )}
        >
          <InitialsAvatar
            name={contextPatient.name}
            imageUrl={contextPatient.image}
            className="h-[26px] w-[26px] [&_span]:text-[10px]"
          />
          <span className="truncate">{contextPatient.name}</span>
        </button>
      )}
      {!isEmpty && (
        <Button
          variant="ghost"
          size="icon"
          onClick={startConversation}
          aria-label="Nowa rozmowa"
          title="Nowa rozmowa (⌘K)"
          data-testid="common-chat-new-btn"
        >
          <SquarePen aria-hidden="true" />
        </Button>
      )}
      <span className="mx-1 h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />
      <HeaderActions />
    </header>
  );
}

function hasDraggedFile(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

/** Chat-first home (DEC-20261029-02, design "Czat v2"): one conversation, cards with the app's actions. */
export function ChatView() {
  const { messages, isBusy, isReady, sendMessage, stopReply, isContextOpen, setContextOpen, activeConversationId } =
    useChatSession();
  const { analyzeFile } = useDocumentAnalysis();
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ChatComposerHandle>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  // Replies that arrive in the open conversation read in; one opened from the sidebar shows at once.
  const [revealMarker, setRevealMarker] = useState<RevealMarker | undefined>(undefined);
  if (revealMarker?.conversationId !== activeConversationId) {
    setRevealMarker(nextRevealMarker(revealMarker, activeConversationId, Date.now()));
  }
  const revealSince = revealMarker?.since ?? Number.POSITIVE_INFINITY;
  const isWide = useMediaQuery('(min-width: 1280px)');
  const isEmpty = messages.length === 0;
  const { isAway, scrollToBottom } = useStickToBottom(scrollRef, activeConversationId, `${messages.length}-${isBusy}`);
  const lastUser = messages.findLast((message) => message.role === 'user');

  // Typing anywhere in the chat lands in the composer, as in Claude.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldTypeIntoComposer(event)) composerRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const attach = (file: File) => {
    if (!isReady || isBusy) return;
    void analyzeFile(file);
  };

  const handleDragEnter = (event: DragEvent) => {
    if (!hasDraggedFile(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (event: DragEvent) => {
    if (!hasDraggedFile(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };
  const handleDrop = (event: DragEvent) => {
    if (!hasDraggedFile(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) attach(file);
  };

  return (
    <div
      data-testid="common-chat-view"
      className={cn(
        'grid min-h-0 flex-1 bg-card',
        isContextOpen && isWide ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
      )}
    >
      <section
        className="relative flex min-h-0 min-w-0 flex-col"
        onDragEnter={handleDragEnter}
        onDragOver={(event) => hasDraggedFile(event) && event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <TopBar />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'mx-auto flex w-full max-w-[760px] flex-col px-4 sm:px-6',
              isEmpty ? 'min-h-full justify-center pb-[12vh]' : 'gap-7 pb-8 pt-6'
            )}
          >
            {isEmpty ? (
              <ChatHome composerRef={composerRef} onSend={sendMessage} onAttach={attach} />
            ) : (
              <ol className="flex flex-col gap-7" aria-live="polite" data-testid="common-chat-thread">
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <li key={message.id} className="flex animate-chat-rise justify-end">
                      <UserMessage message={message} onEdit={(text) => composerRef.current?.setDraft(text)} />
                    </li>
                  ) : (
                    <li key={message.id} className="flex animate-chat-rise">
                      <AssistantMessage message={message} animate={message.createdAt > revealSince} />
                    </li>
                  )
                )}
                {isBusy && <ThinkingLine isDocument={Boolean(lastUser?.role === 'user' && lastUser.attachmentName)} />}
              </ol>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div className="relative shrink-0 px-4 pb-3.5 pt-2 sm:px-6">
            {isAway && (
              <button
                type="button"
                onClick={() => scrollToBottom()}
                aria-label="Przewiń do najnowszej wiadomości"
                data-testid="common-chat-scroll-bottom-btn"
                className="absolute -top-11 left-1/2 inline-flex h-9 w-9 -translate-x-1/2 animate-chat-pop items-center justify-center rounded-full border-[0.5px] border-separator bg-card text-label-secondary shadow-raised transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px]"
              >
                <ArrowDown aria-hidden="true" />
              </button>
            )}
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
              <ChatComposer
                ref={composerRef}
                onSend={sendMessage}
                onAttach={attach}
                onStop={stopReply}
                busy={isBusy}
                disabled={!isReady}
                lastUserText={lastUser?.role === 'user' ? lastUser.text : undefined}
              />
              <p className="text-center text-[12px] text-label-tertiary">
                Do pacjenta trafia tylko to, co zatwierdzisz. Asystent może się mylić.
              </p>
            </div>
          </div>
        )}

        {isDragging && (
          <div
            className="pointer-events-none absolute inset-2 z-20 flex animate-chat-pop flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-tint/50 bg-card/90 text-center backdrop-blur-sm"
            data-testid="common-chat-drop-overlay"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-tint-muted text-tint [&_svg]:size-6">
              <FileUp aria-hidden="true" />
            </span>
            <p className="text-[17px] font-semibold text-foreground">Upuść dokument z zaleceniami</p>
            <p className="text-[14px] text-label-secondary">PDF, Excel, CSV albo TXT. Ułożę z niego zestaw.</p>
          </div>
        )}
      </section>

      {isContextOpen && isWide && <PatientContextPanel />}
      {!isWide && (
        <Sheet open={isContextOpen} onOpenChange={setContextOpen}>
          <SheetContent side="right" className="w-[340px] p-0 sm:max-w-[340px]">
            <SheetTitle className="sr-only">Kontekst pacjenta</SheetTitle>
            <PatientContextPanel />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
