export interface SavedLoadSource {
  defaultLoad?: {
    loadWeightKg?: number | null;
    type?: string | null;
    value?: number | null;
    unit?: string | null;
    text?: string | null;
  } | null;
  loadValue?: number | null;
  loadUnit?: string | null;
}

function isKilograms(source: SavedLoadSource): boolean {
  const load = source.defaultLoad;
  if (load?.loadWeightKg != null) return true;
  if (load?.value != null && (load.unit === 'kg' || load.type === 'weight')) return true;
  return source.loadValue != null && source.loadUnit === 'kg';
}

/**
 * Load saved in a form the kilogram field cannot show (band colour, RPE, free text),
 * e.g. written by the mobile app. Null when there is none or it is in kilograms.
 */
export function describeSavedNonKgLoad(source: SavedLoadSource | null | undefined): string | null {
  if (!source || isKilograms(source)) return null;
  const load = source.defaultLoad;
  const text = load?.text?.trim();
  if (text) return text;
  const value = load?.value ?? source.loadValue;
  const unit = (load?.unit ?? source.loadUnit)?.trim();
  if (value == null) return null;
  return unit ? `${value} ${unit}` : String(value);
}
