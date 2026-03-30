export type LoadPresetKey = 'kg' | 'lb' | 'band' | 'bodyweight' | 'rpe';

interface LoadSource {
  defaultLoad?: {
    type?: string | null;
    value?: number | null;
    unit?: string | null;
    text?: string | null;
  } | null;
  loadUnit?: string | null;
  loadText?: string | null;
}

export interface DefaultLoadUpdateInput {
  type: string | null;
  value: number | null;
  unit: string | null;
  text: string | null;
}

export function resolveLoadPreset(source: LoadSource): LoadPresetKey {
  const normalizedType = source.defaultLoad?.type?.toLowerCase();
  const normalizedUnit = source.defaultLoad?.unit?.toLowerCase() ?? source.loadUnit?.toLowerCase();
  const normalizedText = source.defaultLoad?.text?.toLowerCase() ?? source.loadText?.toLowerCase() ?? '';

  if (normalizedType === 'band') return 'band';
  if (normalizedType === 'bodyweight') return 'bodyweight';
  if (normalizedType === 'weight') {
    return normalizedUnit === 'lb' || normalizedUnit === 'lbs' ? 'lb' : 'kg';
  }
  if (normalizedText.includes('rpe')) return 'rpe';
  return 'kg';
}

export function buildDefaultLoadUpdate(
  loadPreset: LoadPresetKey,
  loadValueInput: string,
  loadTextInput: string
): DefaultLoadUpdateInput {
  const parsedLoadValue = Number.parseFloat(loadValueInput);
  const normalizedValue = Number.isFinite(parsedLoadValue) ? parsedLoadValue : null;
  const normalizedText = loadTextInput.trim();

  if (loadPreset === 'kg') {
    return {
      type: 'weight',
      value: normalizedValue,
      unit: 'kg',
      text: normalizedText || null,
    };
  }

  if (loadPreset === 'lb') {
    return {
      type: 'weight',
      value: normalizedValue,
      unit: 'lbs',
      text: normalizedText || null,
    };
  }

  if (loadPreset === 'band') {
    return {
      type: 'band',
      value: normalizedValue,
      unit: 'level',
      text: normalizedText || 'Guma oporowa',
    };
  }

  if (loadPreset === 'bodyweight') {
    return {
      type: 'bodyweight',
      value: normalizedValue,
      unit: null,
      text: normalizedText || 'Ciężar ciała',
    };
  }

  return {
    type: 'other',
    value: normalizedValue,
    unit: 'level',
    text: normalizedText || 'RPE',
  };
}
