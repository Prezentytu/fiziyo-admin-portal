"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";
import { TypingIndicator } from "./TypingIndicator";

interface AIChatPanelProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Główny panel czatu AI
 */
export function AIChatPanel({ className }: AIChatPanelProps) {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do dołu przy nowych wiadomościach
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // max 4 linie
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Obsługa wysyłania
  const handleSend = useCallback(() => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
      // Reset wysokości textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [inputValue, isLoading, sendMessage]);

  // Obsługa klawiszy (Enter = wyślij, Shift+Enter = nowa linia)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
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

  const hasMessages = messages.length > 0;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Asystent AI
            </h2>
            <p className="text-xs text-muted-foreground">
              Pomogę Ci dobrać ćwiczenia
            </p>
          </div>
        </div>

        {/* Clear chat button */}
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Wyczyść historię"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {!hasMessages ? (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Cześć! Jak mogę pomóc?
            </h3>
            <p className="mb-6 max-w-[280px] text-sm text-muted-foreground">
              Zapytaj mnie o ćwiczenia dla pacjentów. Mogę zaproponować zestawy
              na konkretne partie ciała.
            </p>

            {/* Quick actions in empty state */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Szybkie zapytania
              </p>
              <QuickActions
                onActionClick={handleQuickAction}
                disabled={isLoading}
              />
            </div>
          </div>
        ) : (
          // Messages list
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
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
          <QuickActions
            onActionClick={handleQuickAction}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/60 p-4">
        <div className="flex items-end gap-2 rounded-xl bg-surface-light p-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zapytaj o ćwiczenia..."
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none",
              "disabled:opacity-50"
            )}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "h-9 w-9 shrink-0 rounded-lg",
              "bg-primary hover:bg-primary-dark",
              "disabled:bg-surface-hover disabled:text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
          Enter = wyślij • Shift+Enter = nowa linia
        </p>
      </div>
    </div>
  );
}

