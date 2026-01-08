import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

type LogoVariant = "icon" | "default" | "full";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  asLink?: boolean;
  href?: string;
  className?: string;
  showText?: boolean;
}

// ========================================
// Size configurations
// ========================================

const sizeConfig: Record<LogoSize, { icon: number; text: string; subtitle: string }> = {
  sm: { icon: 28, text: "text-base", subtitle: "text-[8px]" },
  md: { icon: 36, text: "text-lg", subtitle: "text-[10px]" },
  lg: { icon: 44, text: "text-xl", subtitle: "text-xs" },
};

// ========================================
// Component
// ========================================

export function Logo({
  variant = "default",
  size = "md",
  asLink = false,
  href = "/",
  className,
}: LogoProps) {
  const config = sizeConfig[size];

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Icon */}
      <div
        className="relative shrink-0"
        style={{ width: config.icon, height: config.icon }}
      >
        <Image
          src="/images/logo.png"
          alt="FiziYo"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Text */}
      {variant !== "icon" && (
        <div className="flex flex-col justify-center overflow-hidden">
          <span
            className={cn(
              "font-bold leading-tight text-foreground",
              config.text
            )}
          >
            FiziYo
          </span>
          {variant === "full" && (
            <span
              className={cn(
                "text-muted-foreground uppercase tracking-wider leading-tight",
                config.subtitle
              )}
            >
              Admin Panel
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href={href} data-testid="nav-logo-link">
        {content}
      </Link>
    );
  }

  return content;
}

// ========================================
// Logo Icon Only (for special cases like print)
// ========================================

export function LogoIcon({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/logo.png"
        alt="FiziYo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}

