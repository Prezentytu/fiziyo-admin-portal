// Pain Map Types - Professional Body Chart for Physiotherapy

// ============================================
// View Types
// ============================================

export type BodyView = 'front' | 'back' | 'left' | 'right';

// ============================================
// Anatomical Regions
// ============================================

export type AnatomicalRegionId =
  // Head & Neck
  | 'head'
  | 'neck'
  // Upper Body
  | 'shoulder-left'
  | 'shoulder-right'
  | 'upper-arm-left'
  | 'upper-arm-right'
  | 'elbow-left'
  | 'elbow-right'
  | 'forearm-left'
  | 'forearm-right'
  | 'wrist-left'
  | 'wrist-right'
  | 'hand-left'
  | 'hand-right'
  // Torso
  | 'chest'
  | 'abdomen'
  | 'upper-back'
  | 'mid-back'
  | 'lower-back'
  // Spine
  | 'cervical-spine'
  | 'thoracic-spine'
  | 'lumbar-spine'
  | 'sacrum'
  // Lower Body
  | 'hip-left'
  | 'hip-right'
  | 'thigh-left'
  | 'thigh-right'
  | 'knee-left'
  | 'knee-right'
  | 'shin-left'
  | 'shin-right'
  | 'calf-left'
  | 'calf-right'
  | 'ankle-left'
  | 'ankle-right'
  | 'foot-left'
  | 'foot-right';

export interface AnatomicalRegion {
  id: AnatomicalRegionId;
  namePolish: string;
  nameEnglish: string;
  views: BodyView[]; // Which views this region is visible on
  exerciseTags: string[]; // Tags for exercise matching
}

// ============================================
// Pain Types (Clinical)
// ============================================

export type PainTypeId =
  | 'sharp'      // Ostry (XXX)
  | 'dull'       // Tępy (|||)
  | 'radiating'  // Promieniujący (→)
  | 'tingling'   // Mrowienie (...)
  | 'burning'    // Piekący (~~~)
  | 'stiffness'; // Sztywność (###)

export interface PainType {
  id: PainTypeId;
  symbol: string;
  labelPolish: string;
  labelEnglish: string;
  color: string;
  description: string;
}

// ============================================
// Pain Point (Single marking on the map)
// ============================================

export interface PainPoint {
  id: string;
  x: number; // Normalized 0-100 percentage
  y: number; // Normalized 0-100 percentage
  view: BodyView;
  region?: AnatomicalRegionId;
  painType: PainTypeId;
  intensity: number; // 1-10
  timestamp: string;
  notes?: string;
}

// ============================================
// Pain Area (For drawing/painting areas)
// ============================================

export interface PainArea {
  id: string;
  regionId: AnatomicalRegionId;
  view: BodyView;
  painType: PainTypeId;
  intensity: number;
  timestamp: string;
  notes?: string;
}

// ============================================
// Pain Session (Complete recording)
// ============================================

export interface PainSession {
  id: string;
  patientId: string;
  date: string;
  painPoints: PainPoint[];
  painAreas: PainArea[];
  overallPainLevel?: number; // Average or max pain
  notes?: string;
  createdBy?: string; // Therapist ID
}

// ============================================
// Drawing Tool Types
// ============================================

export type DrawingTool =
  | 'point'     // Single point marking
  | 'brush'     // Free drawing
  | 'region'    // Quick region selection
  | 'line'      // For radiating pain direction
  | 'eraser';   // Remove markings

export interface DrawingSettings {
  tool: DrawingTool;
  painType: PainTypeId;
  intensity: number;
  brushSize: number; // For brush tool
}

// ============================================
// Component Props
// ============================================

export interface BodyMapProps {
  patientId: string;
  sessions?: PainSession[];
  currentSession?: PainSession;
  onSave?: (session: PainSession) => void;
  onSessionChange?: (session: Partial<PainSession>) => void;
  readOnly?: boolean;
  className?: string;
  showHistory?: boolean;
  showSuggestedExercises?: boolean;
}

export interface BodyMapToolbarProps {
  settings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  currentView: BodyView;
  onViewChange: (view: BodyView) => void;
  onClear: () => void;
  onClearView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
}

export interface BodyMapSVGProps {
  view: BodyView;
  painPoints: PainPoint[];
  painAreas: PainArea[];
  highlightedRegion?: AnatomicalRegionId;
  onRegionClick?: (regionId: AnatomicalRegionId) => void;
  onRegionHover?: (regionId: AnatomicalRegionId | null) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onCanvasMove?: (x: number, y: number) => void;
  onCanvasStart?: () => void;
  onCanvasEnd?: () => void;
  isDrawing?: boolean;
  drawingSettings?: DrawingSettings;
  className?: string;
}

// ============================================
// History & Comparison
// ============================================

export interface SessionComparison {
  before: PainSession;
  after: PainSession;
  improvement: number; // Percentage improvement (negative = worse)
  regionChanges: {
    regionId: AnatomicalRegionId;
    beforeIntensity: number;
    afterIntensity: number;
    change: number;
  }[];
}

// ============================================
// Export Types
// ============================================

export interface PainMapExportOptions {
  format: 'pdf' | 'png' | 'json';
  includeHistory?: boolean;
  includeNotes?: boolean;
  patientInfo?: {
    name: string;
    dateOfBirth?: string;
    therapistName?: string;
  };
}




