/**
 * Semantic design tokens mapped to CSS variables from globals.css.
 * Do not use raw hex in UI — consume these class names / CSS vars.
 */

export const semanticTokens = {
  background: 'bg-background',
  surface: 'bg-surface',
  surfaceLight: 'bg-surface-light',
  card: 'bg-card',
  foreground: 'text-foreground',
  muted: 'text-muted-foreground',
  border: 'border-border',
  primary: 'bg-primary text-primary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
} as const;

export const cssVars = {
  background: 'var(--background)',
  surface: 'var(--surface)',
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  destructive: 'var(--destructive)',
} as const;
