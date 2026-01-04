"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

/**
 * Animowany wskaźnik pisania (trzy pulsujące kropki)
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1 p-2", className)}>
      <span
        className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-primary/60 animate-typing-dot"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}






