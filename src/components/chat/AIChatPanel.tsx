'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, Trash2, Sparkles, History, FileUp, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { ChatMessage } from './ChatMessage';
import { QuickActions } from './QuickActions';
import { TypingIndicator } from './TypingIndicator';
import { ChatSessionsList } from './ChatSessionsList';
import { VoiceMicButton } from './VoiceMicButton';
import { AddToSetFromChatDialog } from './AddToSetFromChatDialog';
import { documentImportService } from '@/services/documentImportService';
import type { ParsedExercise } from '@/types/chat.types';
import type { DocumentAnalysisResult } from '@/types/import.types';

interface AIChatPanelProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Główny panel czatu AI
 */
export function AIChatPanel({ className }: AIChatPanelProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    sessions,
    currentLocalSessionId,
    loadSession,
    deleteSession,
    startNewSession,
  } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isAddToSetDialogOpen, setIsAddToSetDialogOpen] = useState(false);
  const [selectedExerciseForSet, setSelectedExerciseForSet] = useState<ParsedExercise | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice input
  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const handleVoiceSend = useCallback(
    (text: string) => {
      if (!isLoading && text.trim()) {
        sendMessage(text);
        setInputValue('');
      }
    },
    [isLoading, sendMessage]
  );

  const {
    state: voiceState,
    isSupported: voiceSupported,
    error: voiceError,
    toggleListening,
    interimTranscript,
  } = useVoiceInput({
    language: 'pl-PL',
    autoSend: true,
    onTranscript: handleVoiceTranscript,
    onSend: handleVoiceSend,
    silenceTimeout: 1500,
  });

  // Pokaż błąd voice input
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
    }
  }, [voiceError]);

  // Aktualizuj input z interim transcript podczas mówienia
  useEffect(() => {
    if (voiceState === 'listening' && interimTranscript) {
      // Pokaż interim transcript jako placeholder-like text
      const currentFinal = inputValue;
      if (!currentFinal.endsWith(interimTranscript)) {
        // Możemy pokazać interim jako preview, ale nie nadpisujemy finalu
      }
    }
  }, [voiceState, interimTranscript, inputValue]);

  // Auto-scroll do dołu przy nowych wiadomościach
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // max 4 linie
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Obsługa wysyłania
  const handleSend = useCallback(() => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
      // Reset wysokości textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, isLoading, sendMessage]);

  // Obsługa klawiszy (Enter = wyślij, Shift+Enter = nowa linia)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Obsługa quick actions
  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (!isLoading) {
        sendMessage(prompt);
      }
    },
    [isLoading, sendMessage]
  );

  // Obsługa dodawania ćwiczenia do zestawu
  const handleAddExerciseToSet = useCallback((exercise: ParsedExercise) => {
    setSelectedExerciseForSet(exercise);
    setIsAddToSetDialogOpen(true);
  }, []);

  // Obsługa uploadu pliku
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Walidacja
    if (!documentImportService.isFormatSupported(file)) {
      toast.error('Nieobsługiwany format pliku. Obsługiwane: PDF, Excel, CSV, TXT');
      return;
    }

    if (!documentImportService.isFileSizeValid(file)) {
      toast.error(`Plik za duży. Max: ${documentImportService.getMaxFileSizeMB()}MB`);
      return;
    }

    setIsAnalyzingFile(true);
    setAnalysisResult(null);

    try {
      const result = await documentImportService.analyzeDocument(file);
      setAnalysisResult(result);

      // Wyślij informację do czatu
      const exerciseCount = result.exercises.length;
      const setCount = result.exerciseSets.length;
      const noteCount = result.clinicalNotes.length;

      sendMessage(
        `Przeanalizowałem plik "${file.name}". Znalazłem: ${exerciseCount} ćwiczeń, ${setCount} zestawów, ${noteCount} notatek. ` +
        `Czy chcesz przejść do strony importu, aby przejrzeć i zaimportować dane?`
      );

      toast.success(`Znaleziono ${exerciseCount} ćwiczeń w dokumencie`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd analizy dokumentu';
      toast.error(message);
    } finally {
      setIsAnalyzingFile(false);
    }
  }, [sendMessage]);

  const hasMessages = messages.length > 0;
  const isVoiceListening = voiceState === 'listening';

  return (
    <div className={cn('chat-panel flex h-full flex-col relative overflow-hidden', className)} data-testid="ai-chat-panel">
      {/* History Panel (sliding) */}
      <div
        className={cn(
          'absolute inset-0 z-10 bg-background transition-transform duration-300 ease-out',
          showHistory ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ChatSessionsList
          sessions={sessions}
          currentSessionId={currentLocalSessionId}
          onSelectSession={loadSession}
          onDeleteSession={deleteSession}
          onNewSession={startNewSession}
          onClose={() => setShowHistory(false)}
        />
      </div>

      {/* Main Chat Panel */}
      <div className={cn('flex h-full flex-col', showHistory && 'invisible')}>
        {/* Header - min-h-[60px] to match history panel */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 min-h-[60px]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Asystent AI</h2>
              <p className="text-xs text-muted-foreground">Pomogę Ci dobrać ćwiczenia</p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 mr-8">
            {/* History button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Historia rozmów"
              data-testid="ai-chat-history-btn"
            >
              <History className="h-4 w-4" />
            </Button>

            {/* Clear chat button */}
            {hasMessages && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Wyczyść czat"
                data-testid="ai-chat-clear-btn"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {!hasMessages ? (
            // Empty state
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Cześć! Jak mogę pomóc?</h3>
              <p className="mb-6 max-w-[280px] text-sm text-muted-foreground">
                Zapytaj mnie o ćwiczenia dla pacjentów. Mogę zaproponować zestawy na konkretne partie ciała.
              </p>

              {/* Quick actions in empty state */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Szybkie zapytania</p>
                <QuickActions onActionClick={handleQuickAction} disabled={isLoading} />
              </div>

              {/* Show history hint if there are saved sessions */}
              {sessions.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="mt-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>
                    {sessions.length} {sessions.length === 1 ? 'zapisana rozmowa' : 'zapisanych rozmów'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            // Messages list
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} onAddExerciseToSet={handleAddExerciseToSet} />
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-light border border-border/60">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-surface-light px-4 py-2">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Quick actions above input (when has messages) */}
        {hasMessages && (
          <div className="border-t border-border/40 px-4 py-2">
            <QuickActions onActionClick={handleQuickAction} disabled={isLoading} />
          </div>
        )}

        {/* Analysis result banner */}
        {analysisResult && analysisResult.exercises.length > 0 && (
          <div className="border-t border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <FileUp className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  <strong>{analysisResult.exercises.length}</strong> ćwiczeń gotowych do importu
                </span>
              </div>
              <Link href="/import">
                <Button size="sm" className="gap-1 bg-primary hover:bg-primary-dark">
                  Importuj
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border/60 p-4">
          <div
            className={cn(
              'chat-input-container flex items-center gap-2 rounded-xl border bg-surface-light px-3 py-2.5 transition-colors',
              isVoiceListening ? 'border-destructive/50 bg-destructive/5' : 'border-border/40'
            )}
          >
            <textarea
              ref={textareaRef}
              value={isVoiceListening && interimTranscript ? `${inputValue} ${interimTranscript}` : inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceListening ? 'Słucham...' : 'Zapytaj o ćwiczenia...'}
              disabled={isLoading || isVoiceListening}
              rows={1}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm leading-6 min-h-[24px] py-0',
                'placeholder:text-muted-foreground/60',
                'outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
                'disabled:opacity-50',
                isVoiceListening && 'placeholder:text-destructive/60'
              )}
              data-testid="ai-chat-input"
            />

            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isAnalyzingFile}
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-primary"
              title="Zaimportuj dokument"
              data-testid="ai-chat-upload-btn"
            >
              {isAnalyzingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
            </Button>

            {/* Voice button */}
            <VoiceMicButton
              state={voiceState}
              isSupported={voiceSupported}
              onClick={toggleListening}
              disabled={isLoading}
            />

            {/* Send button */}
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isVoiceListening}
              className={cn(
                'h-8 w-8 shrink-0 rounded-lg',
                'bg-primary hover:bg-primary-dark',
                'disabled:bg-surface-hover disabled:text-muted-foreground',
                'focus-visible:ring-0 focus-visible:outline-none'
              )}
              data-testid="ai-chat-send-btn"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            {voiceSupported
              ? 'Enter = wyślij • Shift+Enter = nowa linia • Kliknij mikrofon aby mówić'
              : 'Enter = wyślij • Shift+Enter = nowa linia'}
          </p>
        </div>
      </div>

      {/* Add to Set Dialog */}
      <AddToSetFromChatDialog
        open={isAddToSetDialogOpen}
        onOpenChange={setIsAddToSetDialogOpen}
        exercise={selectedExerciseForSet}
      />
    </div>
  );
}
