"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  Mail,
  MessageCircle,
  Smartphone,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface ShareSheetProps {
  url: string;
  organizationName: string;
  role: string;
  expiresAt?: string;
  className?: string;
}

interface ShareOption {
  name: string;
  icon: React.ElementType;
  gradient: string;
  hoverGradient: string;
  getUrl: (url: string, text: string) => string;
}

// ========================================
// Custom Icons
// ========================================

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// ========================================
// Share Options Config
// ========================================

const shareOptions: ShareOption[] = [
  {
    name: "WhatsApp",
    icon: WhatsAppIcon,
    gradient: "from-green-500 to-green-600",
    hoverGradient: "hover:from-green-600 hover:to-green-700",
    getUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`,
  },
  {
    name: "Email",
    icon: Mail,
    gradient: "from-blue-500 to-blue-600",
    hoverGradient: "hover:from-blue-600 hover:to-blue-700",
    getUrl: (url, text) =>
      `mailto:?subject=${encodeURIComponent("Zaproszenie do FiziYo")}&body=${encodeURIComponent(text + "\n\n" + url)}`,
  },
  {
    name: "Telegram",
    icon: TelegramIcon,
    gradient: "from-sky-500 to-sky-600",
    hoverGradient: "hover:from-sky-600 hover:to-sky-700",
    getUrl: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "Messenger",
    icon: MessageCircle,
    gradient: "from-purple-500 to-purple-600",
    hoverGradient: "hover:from-purple-600 hover:to-purple-700",
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "SMS",
    icon: Smartphone,
    gradient: "from-emerald-500 to-emerald-600",
    hoverGradient: "hover:from-emerald-600 hover:to-emerald-700",
    getUrl: (url, text) => `sms:?body=${encodeURIComponent(text + " " + url)}`,
  },
];

// ========================================
// Helpers
// ========================================

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  THERAPIST: "Fizjoterapeuta",
  MEMBER: "Członek",
  STAFF: "Personel",
};

// ========================================
// Component
// ========================================

export function ShareSheet({
  url,
  organizationName,
  role,
  expiresAt,
  className,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check for native share support (computed once on mount)
  const supportsNativeShare = typeof globalThis.window !== "undefined" && !!navigator?.share;

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const shareText = `Dołącz do mojego gabinetu "${organizationName}" jako ${roleLabels[role.toUpperCase()] || role}!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link skopiowany!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Zaproszenie do FiziYo",
        text: shareText,
        url: url,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Nie udało się udostępnić");
      }
    }
  };

  const handleShareOption = (option: ShareOption) => {
    const shareUrl = option.getUrl(url, shareText);
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-surface overflow-hidden",
        "transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      data-testid="org-share-sheet"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Udostępnij zaproszenie</h3>
            <p className="text-sm text-muted-foreground">
              {roleLabels[role.toUpperCase()] || role}
              {formattedExpiry && ` • Ważne do ${formattedExpiry}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main content - side by side on desktop */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Left side - QR Code */}
          <div className="flex flex-col items-center sm:items-start">
            <div
              className={cn(
                "p-4 rounded-2xl bg-white shadow-lg ring-1 ring-black/5",
                "transition-all duration-500 delay-100",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
            >
              <QRCodeSVG
                value={url}
                size={160}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center sm:text-left">
              Zeskanuj kod QR telefonem
            </p>
          </div>

          {/* Right side - Share options */}
          <div className="flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground mb-4">
              Lub wybierz sposób udostępnienia:
            </p>

            {/* Share options grid */}
            <div className="grid grid-cols-3 gap-2">
              {shareOptions.map((option, index) => (
                <button
                  key={option.name}
                  onClick={() => handleShareOption(option)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                    "bg-gradient-to-br text-white",
                    "transition-all duration-200 hover:scale-105 hover:shadow-lg",
                    "active:scale-95",
                    option.gradient,
                    option.hoverGradient,
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  )}
                  style={{ transitionDelay: `${100 + index * 40}ms` }}
                  data-testid={`org-share-${option.name.toLowerCase()}-btn`}
                >
                  <option.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{option.name}</span>
                </button>
              ))}

              {/* Copy link button */}
              <button
                onClick={handleCopyLink}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                  "bg-gradient-to-br text-white",
                  "transition-all duration-200 hover:scale-105 hover:shadow-lg",
                  "active:scale-95",
                  copied
                    ? "from-primary to-emerald-600"
                    : "from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
                style={{ transitionDelay: `${100 + shareOptions.length * 40}ms` }}
                data-testid="org-share-copy-btn"
              >
                {copied ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Copy className="h-6 w-6" />
                )}
                <span className="text-xs font-medium">
                  {copied ? "Skopiowano!" : "Kopiuj link"}
                </span>
              </button>
            </div>

            {/* Native share button (mobile) */}
            {supportsNativeShare && (
              <Button
                onClick={handleNativeShare}
                variant="outline"
                size="sm"
                className={cn(
                  "w-full gap-2 mt-3",
                  "transition-all duration-500",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
                style={{ transitionDelay: "350ms" }}
              >
                <Share2 className="h-4 w-4" />
                Więcej opcji...
              </Button>
            )}
          </div>
        </div>

        {/* URL Preview */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 mt-5 rounded-xl bg-surface-light/50 border border-border/40",
            "transition-all duration-500 delay-300",
            isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <code className="flex-1 text-xs text-muted-foreground truncate font-mono">
            {url}
          </code>
          <button
            onClick={handleCopyLink}
            className={cn(
              "shrink-0 p-2 rounded-lg transition-all duration-200",
              "hover:bg-surface-hover",
              copied && "text-primary"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
