/**
 * Design tokens - zgodne z fizjo-app mobile
 * Single source of truth dla kolorów i spacing
 */

export const colors = {
  primary: "#22C55E",
  primaryLight: "#4ADE80",
  primaryDark: "#16A34A",
  secondary: "#2DD4BF",
  background: "#000000",
  surface: "#1A1A1A",
  surfaceLight: "#2A2A2A",
  surfaceHover: "#2F2F2F",
  text: {
    primary: "#FFFFFF",
    secondary: "#BBBBBB",
    tertiary: "#9CA3AF",
    disabled: "#666666",
    inverse: "#333333",
    onPrimary: "#1A1A1A",
  },
  success: "#22C55E",
  error: "#EF4444",
  warning: "#FBBF24",
  info: "#60A5FA",
  border: "#3A3A3A",
  shadow: "rgba(0, 0, 0, 0.15)",
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  xxl: "3rem",
} as const;

export const radius = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  full: "9999px",
} as const;
