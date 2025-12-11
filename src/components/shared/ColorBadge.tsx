"use client";

import { cn } from "@/lib/utils";

interface ColorBadgeProps {
  color?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Returns a contrasting text color (black or white) based on the background color
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  
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
function getTransparentColor(hexColor: string, opacity: number = 0.2): string {
  const hex = hexColor.replace("#", "");
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
  color = "#888888", 
  children, 
  className,
  size = "md",
}: ColorBadgeProps) {
  const backgroundColor = getTransparentColor(color, 0.2);
  const textColor = color;
  const borderColor = getTransparentColor(color, 0.3);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        "border transition-colors",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor,
        color: textColor,
        borderColor,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}

/**
 * Solid variant - full color background with contrasting text
 */
export function ColorBadgeSolid({ 
  color = "#888888", 
  children, 
  className,
  size = "md",
}: ColorBadgeProps) {
  const textColor = getContrastColor(color);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      {children}
    </span>
  );
}

export { getContrastColor, getTransparentColor };




