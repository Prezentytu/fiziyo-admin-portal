"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AIChatPanel } from "./AIChatPanel";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

/**
 * Floating Action Button z panelem czatu AI
 * Umieszczany w layout.tsx dashboardu
 */
export function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      {/* Floating Action Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-40",
              "flex h-14 w-14 items-center justify-center",
              "rounded-full shadow-xl",
              "bg-gradient-to-br from-primary via-primary to-primary-dark",
              "text-white",
              "transition-all duration-300 ease-out",
              "hover:scale-110 hover:shadow-2xl hover:shadow-primary/30",
              "active:scale-95",
              "animate-pulse-glow",
              // Hide when sheet is open
              isOpen && "pointer-events-none opacity-0"
            )}
            aria-label="Otwórz asystenta AI"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          Asystent AI
        </TooltipContent>
      </Tooltip>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          hideCloseButton
          className={cn(
            "w-full sm:max-w-[480px] p-0",
            "bg-background border-l border-border/60",
            "flex flex-col"
          )}
        >
          {/* Accessible title (hidden visually) */}
          <VisuallyHidden.Root>
            <SheetTitle>Asystent AI</SheetTitle>
          </VisuallyHidden.Root>

          {/* Custom close button */}
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              "absolute right-4 top-4 z-10",
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-surface-light",
              "transition-colors duration-200"
            )}
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Chat Panel */}
          <AIChatPanel onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

