"use client";

import { useState } from "react";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ========================================
// Types
// ========================================

interface ShareInviteButtonProps {
  url: string;
  patientName?: string;
  variant?: "default" | "icon";
  className?: string;
}

// ========================================
// Component
// ========================================

/**
 * Share button with Native Share API support
 * Falls back to copy-to-clipboard on desktop
 */
export function ShareInviteButton({
  url,
  patientName,
  variant = "icon",
  className,
}: ShareInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  // Prepare share message
  const shareText = patientName
    ? `Cześć ${patientName}! Tu Twój fizjoterapeuta. Przesyłam Twój plan ćwiczeń. Pierwszy miesiąc masz w cenie wizyty!`
    : `Cześć! Tu Twój fizjoterapeuta. Przesyłam Twój plan ćwiczeń. Pierwszy miesiąc masz w cenie wizyty!`;

  const shareData = {
    title: "Plan ćwiczeń od FiziYo",
    text: shareText,
    url: url,
  };

  // Check if Native Share API is available
  const canShare =
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare(shareData);

  // Handle native share
  const handleNativeShare = async () => {
    try {
      await navigator.share(shareData);
      toast.success("Udostępniono!");
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== "AbortError") {
        toast.error("Nie udało się udostępnić");
      }
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link skopiowany do schowka!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  // Handle copy with message
  const handleCopyWithMessage = async () => {
    try {
      const fullMessage = `${shareText}\n\n${url}`;
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success("Wiadomość skopiowana do schowka!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  // If native share is available, use it directly
  if (canShare) {
    if (variant === "icon") {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNativeShare}
          className={className}
          title="Udostępnij"
          data-testid="share-invite-btn"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        className={className}
        data-testid="share-invite-btn"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Udostępnij
      </Button>
    );
  }

  // Fallback: dropdown with copy options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={className}
            title="Udostępnij"
            data-testid="share-invite-btn"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={className}
            data-testid="share-invite-btn"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-emerald-500" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Udostępnij
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Kopiuj link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyWithMessage}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Kopiuj z wiadomością
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
