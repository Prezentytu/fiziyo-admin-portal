// Body Map Components - Professional Pain Body Chart
export { BodyMapNew as BodyMap } from './BodyMapNew';
export { BodyMapSVG } from './BodyMapSVG';
export { BodyMapToolbar } from './BodyMapToolbar';
export { BodyMapHistory } from './BodyMapHistory';
export { BodyMapExercises } from './BodyMapExercises';
export { BodyMapExport } from './BodyMapExport';

// Regions and Pain Types
export {
  PAIN_TYPES,
  ANATOMICAL_REGIONS,
  PAIN_INTENSITY_COLORS,
  REGION_GROUPS,
  getRegionsForView,
  getRegionById,
  getPainTypeById,
  getExerciseTagsForRegions,
} from './BodyMapRegions';

// Re-export types
export type {
  BodyView,
  AnatomicalRegionId,
  PainTypeId,
  PainPoint,
  PainArea,
  PainSession,
  DrawingSettings,
  DrawingTool,
  BodyMapProps,
} from '@/types/painMap';
