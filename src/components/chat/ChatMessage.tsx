"use client";

import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseExercisesFromHtml, stripExerciseBlocks } from "@/hooks/useChat";
import { ExerciseCard } from "./ExerciseCard";
import type { ChatMessageType } from "@/types/chat.types";

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
}

/**
 * Pojedyncza wiadomość w czacie (user lub AI)
 */
export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Dla wiadomości AI - parsuj ćwiczenia
  const exercises = !isUser ? parseExercisesFromHtml(message.content) : [];
  const textContent = !isUser
    ? stripExerciseBlocks(message.content)
    : message.content;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-gradient-to-br from-primary to-primary-dark"
            : "bg-surface-light border border-border/60"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 space-y-3",
          isUser ? "flex flex-col items-end" : "flex flex-col items-start"
        )}
      >
        {/* Tekst wiadomości */}
        {textContent && (
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
              isUser
                ? "bg-gradient-to-br from-primary to-primary-dark text-white rounded-tr-md"
                : "bg-surface-light text-foreground rounded-tl-md"
            )}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
          </div>
        )}

        {/* Ćwiczenia (tylko dla AI) */}
        {exercises.length > 0 && (
          <div className="w-full max-w-[95%] space-y-2">
            {exercises.map((exercise, index) => (
              <ExerciseCard key={index} exercise={exercise} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 px-1">
          {message.timestamp.toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

