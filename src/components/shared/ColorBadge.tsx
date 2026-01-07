"use client";

import { cn } from "@/lib/utils";

const DEFAULT_TAG_COLOR = "#22c55e"; // primary color

interface ColorBadgeProps {
  color?: string | null;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Returns a contrasting text color (black or white) based on the background color
 */
function getContrastColor(hexColor: string | null | undefined): string {
  const safeColor = hexColor || DEFAULT_TAG_COLOR;
  // Remove # if present
  const hex = safeColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Creates a semi-transparent version of a color for backgrounds
 */
function getTransparentColor(
  hexColor: string | null | undefined,
  opacity: number = 0.2
): string {
  const safeColor = hexColor || DEFAULT_TAG_COLOR;
  const hex = safeColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function ColorBadge({
  color,
  children,
  className,
  size = "md",
}: ColorBadgeProps) {
  // Handle null/undefined - use default color (like mobile app does)
  const safeColor = color || DEFAULT_TAG_COLOR;
  // Use solid background with contrasting text for better visibility
  const textColor = getContrastColor(safeColor);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        "border transition-colors shadow-sm",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: safeColor,
        color: textColor,
        borderColor: safeColor,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Solid variant - full color background with contrasting text
 */
export function ColorBadgeSolid({
  color,
  children,
  className,
  size = "md",
}: ColorBadgeProps) {
  // Handle null/undefined - use default color
  const safeColor = color || DEFAULT_TAG_COLOR;
  const textColor = getContrastColor(safeColor);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: safeColor,
        color: textColor,
      }}
    >
      {children}
    </span>
  );
}

export { getContrastColor, getTransparentColor };















