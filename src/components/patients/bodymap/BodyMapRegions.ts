import type { AnatomicalRegion, AnatomicalRegionId, PainType, PainTypeId, BodyView } from '@/types/painMap';

// ============================================
// Pain Types Configuration
// ============================================

export const PAIN_TYPES: Record<PainTypeId, PainType> = {
  sharp: {
    id: 'sharp',
    symbol: '✕',
    labelPolish: 'Ostry',
    labelEnglish: 'Sharp',
    color: '#ef4444', // red-500
    description: 'Nagły, przeszywający ból (np. po urazie)',
  },
  dull: {
    id: 'dull',
    symbol: '●',
    labelPolish: 'Tępy',
    labelEnglish: 'Dull',
    color: '#f97316', // orange-500
    description: 'Stały, głęboki ból (przewlekły)',
  },
  radiating: {
    id: 'radiating',
    symbol: '→',
    labelPolish: 'Promieniujący',
    labelEnglish: 'Radiating',
    color: '#a855f7', // purple-500
    description: 'Ból rozchodzący się (np. rwa kulszowa)',
  },
  tingling: {
    id: 'tingling',
    symbol: '∿',
    labelPolish: 'Mrowienie',
    labelEnglish: 'Tingling',
    color: '#3b82f6', // blue-500
    description: 'Drętwienie, parestezje',
  },
  burning: {
    id: 'burning',
    symbol: '🔥',
    labelPolish: 'Piekący',
    labelEnglish: 'Burning',
    color: '#eab308', // yellow-500
    description: 'Uczucie pieczenia, palenia',
  },
  stiffness: {
    id: 'stiffness',
    symbol: '▤',
    labelPolish: 'Sztywność',
    labelEnglish: 'Stiffness',
    color: '#6b7280', // gray-500
    description: 'Ograniczenie ruchu, sztywność',
  },
};

// ============================================
// Anatomical Regions Configuration
// ============================================

export const ANATOMICAL_REGIONS: Record<AnatomicalRegionId, AnatomicalRegion> = {
  // Head & Neck
  head: {
    id: 'head',
    namePolish: 'Głowa',
    nameEnglish: 'Head',
    views: ['front', 'back', 'left', 'right'],
    exerciseTags: ['szyja', 'głowa', 'cervical'],
  },
  neck: {
    id: 'neck',
    namePolish: 'Szyja',
    nameEnglish: 'Neck',
    views: ['front', 'back', 'left', 'right'],
    exerciseTags: ['szyja', 'cervical', 'kręgosłup szyjny'],
  },

  // Upper Body - Shoulders
  'shoulder-left': {
    id: 'shoulder-left',
    namePolish: 'Bark lewy',
    nameEnglish: 'Left Shoulder',
    views: ['front', 'back', 'left'],
    exerciseTags: ['bark', 'ramię', 'rotator-cuff', 'stożek rotatorów'],
  },
  'shoulder-right': {
    id: 'shoulder-right',
    namePolish: 'Bark prawy',
    nameEnglish: 'Right Shoulder',
    views: ['front', 'back', 'right'],
    exerciseTags: ['bark', 'ramię', 'rotator-cuff', 'stożek rotatorów'],
  },

  // Upper Arms
  'upper-arm-left': {
    id: 'upper-arm-left',
    namePolish: 'Ramię lewe',
    nameEnglish: 'Left Upper Arm',
    views: ['front', 'back', 'left'],
    exerciseTags: ['ramię', 'biceps', 'triceps'],
  },
  'upper-arm-right': {
    id: 'upper-arm-right',
    namePolish: 'Ramię prawe',
    nameEnglish: 'Right Upper Arm',
    views: ['front', 'back', 'right'],
    exerciseTags: ['ramię', 'biceps', 'triceps'],
  },

  // Elbows
  'elbow-left': {
    id: 'elbow-left',
    namePolish: 'Łokieć lewy',
    nameEnglish: 'Left Elbow',
    views: ['front', 'back', 'left'],
    exerciseTags: ['łokieć', 'przedramię', 'tenisowy'],
  },
  'elbow-right': {
    id: 'elbow-right',
    namePolish: 'Łokieć prawy',
    nameEnglish: 'Right Elbow',
    views: ['front', 'back', 'right'],
    exerciseTags: ['łokieć', 'przedramię', 'tenisowy'],
  },

  // Forearms
  'forearm-left': {
    id: 'forearm-left',
    namePolish: 'Przedramię lewe',
    nameEnglish: 'Left Forearm',
    views: ['front', 'back', 'left'],
    exerciseTags: ['przedramię', 'nadgarstek'],
  },
  'forearm-right': {
    id: 'forearm-right',
    namePolish: 'Przedramię prawe',
    nameEnglish: 'Right Forearm',
    views: ['front', 'back', 'right'],
    exerciseTags: ['przedramię', 'nadgarstek'],
  },

  // Wrists
  'wrist-left': {
    id: 'wrist-left',
    namePolish: 'Nadgarstek lewy',
    nameEnglish: 'Left Wrist',
    views: ['front', 'back', 'left'],
    exerciseTags: ['nadgarstek', 'dłoń', 'cieśń nadgarstka'],
  },
  'wrist-right': {
    id: 'wrist-right',
    namePolish: 'Nadgarstek prawy',
    nameEnglish: 'Right Wrist',
    views: ['front', 'back', 'right'],
    exerciseTags: ['nadgarstek', 'dłoń', 'cieśń nadgarstka'],
  },

  // Hands
  'hand-left': {
    id: 'hand-left',
    namePolish: 'Dłoń lewa',
    nameEnglish: 'Left Hand',
    views: ['front', 'back', 'left'],
    exerciseTags: ['dłoń', 'palce', 'nadgarstek'],
  },
  'hand-right': {
    id: 'hand-right',
    namePolish: 'Dłoń prawa',
    nameEnglish: 'Right Hand',
    views: ['front', 'back', 'right'],
    exerciseTags: ['dłoń', 'palce', 'nadgarstek'],
  },

  // Torso
  chest: {
    id: 'chest',
    namePolish: 'Klatka piersiowa',
    nameEnglish: 'Chest',
    views: ['front'],
    exerciseTags: ['klatka piersiowa', 'oddychanie', 'żebra'],
  },
  abdomen: {
    id: 'abdomen',
    namePolish: 'Brzuch',
    nameEnglish: 'Abdomen',
    views: ['front'],
    exerciseTags: ['brzuch', 'core', 'mięśnie brzucha'],
  },
  'upper-back': {
    id: 'upper-back',
    namePolish: 'Górna część pleców',
    nameEnglish: 'Upper Back',
    views: ['back'],
    exerciseTags: ['plecy', 'łopatki', 'thoracic'],
  },
  'mid-back': {
    id: 'mid-back',
    namePolish: 'Środkowa część pleców',
    nameEnglish: 'Mid Back',
    views: ['back'],
    exerciseTags: ['plecy', 'kręgosłup piersiowy', 'thoracic'],
  },
  'lower-back': {
    id: 'lower-back',
    namePolish: 'Dolna część pleców',
    nameEnglish: 'Lower Back',
    views: ['back'],
    exerciseTags: ['plecy', 'lędźwiowy', 'lumbar', 'core'],
  },

  // Spine
  'cervical-spine': {
    id: 'cervical-spine',
    namePolish: 'Kręgosłup szyjny',
    nameEnglish: 'Cervical Spine',
    views: ['back', 'left', 'right'],
    exerciseTags: ['kręgosłup szyjny', 'szyja', 'cervical', 'C1-C7'],
  },
  'thoracic-spine': {
    id: 'thoracic-spine',
    namePolish: 'Kręgosłup piersiowy',
    nameEnglish: 'Thoracic Spine',
    views: ['back', 'left', 'right'],
    exerciseTags: ['kręgosłup piersiowy', 'thoracic', 'Th1-Th12'],
  },
  'lumbar-spine': {
    id: 'lumbar-spine',
    namePolish: 'Kręgosłup lędźwiowy',
    nameEnglish: 'Lumbar Spine',
    views: ['back', 'left', 'right'],
    exerciseTags: ['kręgosłup lędźwiowy', 'lumbar', 'L1-L5', 'core'],
  },
  sacrum: {
    id: 'sacrum',
    namePolish: 'Kość krzyżowa',
    nameEnglish: 'Sacrum',
    views: ['back'],
    exerciseTags: ['sacrum', 'miednica', 'SI joint'],
  },

  // Hips
  'hip-left': {
    id: 'hip-left',
    namePolish: 'Biodro lewe',
    nameEnglish: 'Left Hip',
    views: ['front', 'back', 'left'],
    exerciseTags: ['biodro', 'miednica', 'pośladki'],
  },
  'hip-right': {
    id: 'hip-right',
    namePolish: 'Biodro prawe',
    nameEnglish: 'Right Hip',
    views: ['front', 'back', 'right'],
    exerciseTags: ['biodro', 'miednica', 'pośladki'],
  },

  // Thighs
  'thigh-left': {
    id: 'thigh-left',
    namePolish: 'Udo lewe',
    nameEnglish: 'Left Thigh',
    views: ['front', 'back', 'left'],
    exerciseTags: ['udo', 'quadriceps', 'hamstring', 'przywodziciele'],
  },
  'thigh-right': {
    id: 'thigh-right',
    namePolish: 'Udo prawe',
    nameEnglish: 'Right Thigh',
    views: ['front', 'back', 'right'],
    exerciseTags: ['udo', 'quadriceps', 'hamstring', 'przywodziciele'],
  },

  // Knees
  'knee-left': {
    id: 'knee-left',
    namePolish: 'Kolano lewe',
    nameEnglish: 'Left Knee',
    views: ['front', 'back', 'left'],
    exerciseTags: ['kolano', 'udo', 'quadriceps', 'ACL'],
  },
  'knee-right': {
    id: 'knee-right',
    namePolish: 'Kolano prawe',
    nameEnglish: 'Right Knee',
    views: ['front', 'back', 'right'],
    exerciseTags: ['kolano', 'udo', 'quadriceps', 'ACL'],
  },

  // Shins
  'shin-left': {
    id: 'shin-left',
    namePolish: 'Goleń lewa',
    nameEnglish: 'Left Shin',
    views: ['front', 'left'],
    exerciseTags: ['goleń', 'piszczel', 'podudzie'],
  },
  'shin-right': {
    id: 'shin-right',
    namePolish: 'Goleń prawa',
    nameEnglish: 'Right Shin',
    views: ['front', 'right'],
    exerciseTags: ['goleń', 'piszczel', 'podudzie'],
  },

  // Calves
  'calf-left': {
    id: 'calf-left',
    namePolish: 'Łydka lewa',
    nameEnglish: 'Left Calf',
    views: ['back', 'left'],
    exerciseTags: ['łydka', 'achilles', 'podudzie'],
  },
  'calf-right': {
    id: 'calf-right',
    namePolish: 'Łydka prawa',
    nameEnglish: 'Right Calf',
    views: ['back', 'right'],
    exerciseTags: ['łydka', 'achilles', 'podudzie'],
  },

  // Ankles
  'ankle-left': {
    id: 'ankle-left',
    namePolish: 'Kostka lewa',
    nameEnglish: 'Left Ankle',
    views: ['front', 'back', 'left'],
    exerciseTags: ['kostka', 'staw skokowy', 'stopa'],
  },
  'ankle-right': {
    id: 'ankle-right',
    namePolish: 'Kostka prawa',
    nameEnglish: 'Right Ankle',
    views: ['front', 'back', 'right'],
    exerciseTags: ['kostka', 'staw skokowy', 'stopa'],
  },

  // Feet
  'foot-left': {
    id: 'foot-left',
    namePolish: 'Stopa lewa',
    nameEnglish: 'Left Foot',
    views: ['front', 'back', 'left'],
    exerciseTags: ['stopa', 'palce stopy', 'podeszwa'],
  },
  'foot-right': {
    id: 'foot-right',
    namePolish: 'Stopa prawa',
    nameEnglish: 'Right Foot',
    views: ['front', 'back', 'right'],
    exerciseTags: ['stopa', 'palce stopy', 'podeszwa'],
  },
};

// ============================================
// Helper Functions
// ============================================

export function getRegionsForView(view: BodyView): AnatomicalRegion[] {
  return Object.values(ANATOMICAL_REGIONS).filter(region =>
    region.views.includes(view)
  );
}

export function getRegionById(id: AnatomicalRegionId): AnatomicalRegion {
  return ANATOMICAL_REGIONS[id];
}

export function getPainTypeById(id: PainTypeId): PainType {
  return PAIN_TYPES[id];
}

export function getExerciseTagsForRegions(regionIds: AnatomicalRegionId[]): string[] {
  const tags = new Set<string>();
  regionIds.forEach(id => {
    const region = ANATOMICAL_REGIONS[id];
    if (region) {
      region.exerciseTags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags);
}

// Group regions by body part for quick selection UI
export interface RegionGroup {
  id: string;
  namePolish: string;
  regions: AnatomicalRegionId[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    id: 'head-neck',
    namePolish: 'Głowa i szyja',
    regions: ['head', 'neck', 'cervical-spine'],
  },
  {
    id: 'shoulders-arms',
    namePolish: 'Barki i ramiona',
    regions: ['shoulder-left', 'shoulder-right', 'upper-arm-left', 'upper-arm-right'],
  },
  {
    id: 'elbows-forearms',
    namePolish: 'Łokcie i przedramiona',
    regions: ['elbow-left', 'elbow-right', 'forearm-left', 'forearm-right'],
  },
  {
    id: 'wrists-hands',
    namePolish: 'Nadgarstki i dłonie',
    regions: ['wrist-left', 'wrist-right', 'hand-left', 'hand-right'],
  },
  {
    id: 'spine',
    namePolish: 'Kręgosłup',
    regions: ['cervical-spine', 'thoracic-spine', 'lumbar-spine', 'sacrum'],
  },
  {
    id: 'torso',
    namePolish: 'Tułów',
    regions: ['chest', 'abdomen', 'upper-back', 'mid-back', 'lower-back'],
  },
  {
    id: 'hips',
    namePolish: 'Biodra',
    regions: ['hip-left', 'hip-right'],
  },
  {
    id: 'thighs-knees',
    namePolish: 'Uda i kolana',
    regions: ['thigh-left', 'thigh-right', 'knee-left', 'knee-right'],
  },
  {
    id: 'lower-legs',
    namePolish: 'Podudzia',
    regions: ['shin-left', 'shin-right', 'calf-left', 'calf-right'],
  },
  {
    id: 'ankles-feet',
    namePolish: 'Kostki i stopy',
    regions: ['ankle-left', 'ankle-right', 'foot-left', 'foot-right'],
  },
];

// Pain intensity colors (gradient from green to red)
export const PAIN_INTENSITY_COLORS: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: '#22c55e', border: '#16a34a', label: 'Minimalny' },
  2: { bg: '#4ade80', border: '#22c55e', label: 'Bardzo niski' },
  3: { bg: '#a3e635', border: '#84cc16', label: 'Niski' },
  4: { bg: '#facc15', border: '#eab308', label: 'Lekki' },
  5: { bg: '#fbbf24', border: '#f59e0b', label: 'Średni' },
  6: { bg: '#fb923c', border: '#f97316', label: 'Umiarkowany' },
  7: { bg: '#f97316', border: '#ea580c', label: 'Podwyższony' },
  8: { bg: '#ef4444', border: '#dc2626', label: 'Silny' },
  9: { bg: '#dc2626', border: '#b91c1c', label: 'Bardzo silny' },
  10: { bg: '#991b1b', border: '#7f1d1d', label: 'Ekstremalny' },
};





