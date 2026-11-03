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

/** Load in kilograms, or null when it is saved some other way (band, RPE, pounds, text). */
export function readSavedLoadKg(source: SavedLoadSource): number | null {
  const load = source.defaultLoad;
  if (load?.loadWeightKg != null && !Number.isNaN(load.loadWeightKg)) return load.loadWeightKg;
  if (load?.value != null && (load.unit === 'kg' || (load.type === 'weight' && !load.unit))) return load.value;
  if (source.loadValue != null && source.loadUnit === 'kg') return source.loadValue;
  return null;
}

/**
 * Load saved in a form the kilogram field cannot show (band colour, RPE, pounds, free text),
 * e.g. written by the mobile app. Null when there is none or it is in kilograms.
 */
export function describeSavedNonKgLoad(source: SavedLoadSource | null | undefined): string | null {
  if (!source || readSavedLoadKg(source) != null) return null;
  const load = source.defaultLoad;
  const text = load?.text?.trim();
  if (text) return text;
  const value = load?.value ?? source.loadValue;
  const unit = (load?.unit ?? source.loadUnit)?.trim();
  if (value == null) return null;
  return unit ? `${value} ${unit}` : String(value);
}
