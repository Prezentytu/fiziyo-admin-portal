"use client";

import { MessageSquare, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SerializableChatSession } from "@/types/chat.types";

interface ChatSessionsListProps {
  sessions: SerializableChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  onClose: () => void;
}

/**
 * Lista poprzednich rozmów czatu AI
 */
export function ChatSessionsList({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  onClose,
}: ChatSessionsListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Wczoraj";
    } else if (diffDays < 7) {
      return `${diffDays} dni temu`;
    } else {
      return date.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header - same height as main chat header */}
      <div className="relative flex items-center border-b border-border/60 px-4 py-3 min-h-[60px]">
        <h3 className="text-sm font-semibold text-foreground">
          Historia rozmów
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onNewSession();
            onClose();
          }}
          className="ml-auto mr-10 h-8 gap-1.5 text-xs text-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Nowa
        </Button>
        {/* X button - positioned to match Sheet close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sessions list */}
      <ScrollArea className="flex-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-light">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Brak zapisanych rozmów
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Rozpocznij nową rozmowę, a zostanie automatycznie zapisana
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const messageCount = session.messages.length;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "group relative rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-surface-light border border-transparent"
                  )}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  data-testid={`ai-chat-session-${session.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-primary/20" : "bg-surface-light"
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-primary" : "text-foreground"
                        )}
                      >
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(session.updatedAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          •
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {messageCount}{" "}
                          {messageCount === 1 ? "wiadomość" : "wiadomości"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delete button - visible on hover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2",
                      "h-7 w-7 opacity-0 group-hover:opacity-100",
                      "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                      "transition-opacity"
                    )}
                    data-testid={`ai-chat-session-${session.id}-delete-btn`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer info */}
      {sessions.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Przechowywane lokalnie • max 20 rozmów
          </p>
        </div>
      )}
    </div>
  );
}
