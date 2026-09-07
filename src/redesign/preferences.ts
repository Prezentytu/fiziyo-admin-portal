import { z } from 'zod';

const designVariantSchema = z.enum(['current', 'redesign']);

export type DesignVariant = z.infer<typeof designVariantSchema>;

export const DESIGN_PREFERENCE = {
  storageKey: 'fiziyo-design-preview',
  attribute: 'data-fiziyo-design',
  defaultVariant: designVariantSchema.enum.current,
  variants: designVariantSchema.options,
} as const;

export function isDesignPreviewEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function parseDesignVariant(value: unknown): DesignVariant {
  const result = designVariantSchema.safeParse(value);
  return result.success ? result.data : DESIGN_PREFERENCE.defaultVariant;
}

export function readDesignVariant(): DesignVariant {
  if (!isDesignPreviewEnabled()) return DESIGN_PREFERENCE.defaultVariant;
  try {
    return parseDesignVariant(window.localStorage.getItem(DESIGN_PREFERENCE.storageKey));
  } catch {
    return DESIGN_PREFERENCE.defaultVariant;
  }
}

export function saveDesignVariant(variant: DesignVariant): void {
  if (!isDesignPreviewEnabled()) return;
  try {
    window.localStorage.setItem(DESIGN_PREFERENCE.storageKey, parseDesignVariant(variant));
  } catch {
    return;
  }
}

export function applyDesignVariant(value: unknown): DesignVariant {
  const variant = isDesignPreviewEnabled() ? parseDesignVariant(value) : DESIGN_PREFERENCE.defaultVariant;
  document.documentElement.setAttribute(DESIGN_PREFERENCE.attribute, variant);
  return variant;
}

export function getDesignVariantScript(): string {
  if (!isDesignPreviewEnabled()) return '';
  const config = JSON.stringify(DESIGN_PREFERENCE).replace(/</g, '\\u003c');
  return `(function(config) {
    var saved = null;
    try { saved = localStorage.getItem(config.storageKey); } catch {}
    var variant = config.variants.includes(saved) ? saved : config.defaultVariant;
    document.documentElement.setAttribute(config.attribute, variant);
  })(${config});`;
}
