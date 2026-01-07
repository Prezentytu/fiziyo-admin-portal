'use client';

import { useRef, useCallback, useMemo } from 'react';
import type { BodyView, AnatomicalRegionId, PainPoint, PainArea, DrawingSettings } from '@/types/painMap';
import { ANATOMICAL_REGIONS, PAIN_TYPES, PAIN_INTENSITY_COLORS } from './BodyMapRegions';
import { cn } from '@/lib/utils';

interface BodyMapSVGProps {
  view: BodyView;
  painPoints: PainPoint[];
  painAreas: PainArea[];
  highlightedRegion?: AnatomicalRegionId | null;
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

// SVG viewBox dimensions (normalized coordinate space)
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 400;

// Professional anatomical SVG paths for each view
// These are high-quality, anatomically correct paths

const BODY_PATHS = {
  front: {
    // Head
    head: 'M100,15 C80,15 65,35 65,55 C65,80 80,95 100,95 C120,95 135,80 135,55 C135,35 120,15 100,15 Z',
    // Neck
    neck: 'M88,95 L88,115 Q88,120 93,120 L107,120 Q112,120 112,115 L112,95 Q100,105 88,95 Z',
    // Shoulders
    'shoulder-left': 'M45,120 Q35,125 30,140 L45,145 L60,135 Q70,125 75,120 L60,115 Q50,117 45,120 Z',
    'shoulder-right': 'M155,120 Q165,125 170,140 L155,145 L140,135 Q130,125 125,120 L140,115 Q150,117 155,120 Z',
    // Chest
    chest: 'M75,120 Q88,120 100,125 Q112,120 125,120 L130,180 Q100,190 70,180 L75,120 Z',
    // Upper Arms
    'upper-arm-left': 'M45,145 L30,140 L20,180 L25,220 L40,220 L50,180 L60,135 L45,145 Z',
    'upper-arm-right': 'M155,145 L170,140 L180,180 L175,220 L160,220 L150,180 L140,135 L155,145 Z',
    // Elbows
    'elbow-left': 'M25,220 L20,235 Q18,245 22,255 L40,255 Q45,245 42,235 L40,220 L25,220 Z',
    'elbow-right': 'M175,220 L180,235 Q182,245 178,255 L160,255 Q155,245 158,235 L160,220 L175,220 Z',
    // Forearms
    'forearm-left': 'M22,255 L18,300 L22,320 L38,320 L42,300 L40,255 L22,255 Z',
    'forearm-right': 'M178,255 L182,300 L178,320 L162,320 L158,300 L160,255 L178,255 Z',
    // Wrists
    'wrist-left': 'M22,320 L20,335 L25,340 L35,340 L40,335 L38,320 L22,320 Z',
    'wrist-right': 'M178,320 L180,335 L175,340 L165,340 L160,335 L162,320 L178,320 Z',
    // Hands
    'hand-left': 'M20,335 L15,360 L18,375 L25,380 L30,375 L32,365 L35,380 L40,378 L42,365 L45,340 L35,340 L25,340 L20,335 Z',
    'hand-right': 'M180,335 L185,360 L182,375 L175,380 L170,375 L168,365 L165,380 L160,378 L158,365 L155,340 L165,340 L175,340 L180,335 Z',
    // Abdomen
    abdomen: 'M70,180 Q100,190 130,180 L128,240 Q100,250 72,240 L70,180 Z',
    // Hips
    'hip-left': 'M72,240 L60,265 L70,280 L90,275 Q90,250 72,240 Z',
    'hip-right': 'M128,240 L140,265 L130,280 L110,275 Q110,250 128,240 Z',
    // Thighs
    'thigh-left': 'M60,265 L55,320 L60,345 L85,345 L90,320 L90,275 L70,280 L60,265 Z',
    'thigh-right': 'M140,265 L145,320 L140,345 L115,345 L110,320 L110,275 L130,280 L140,265 Z',
    // Knees
    'knee-left': 'M55,345 L52,365 Q50,375 55,385 L85,385 Q90,375 88,365 L85,345 L55,345 Z',
    'knee-right': 'M145,345 L148,365 Q150,375 145,385 L115,385 Q110,375 112,365 L115,345 L145,345 Z',
    // Shins
    'shin-left': 'M55,385 L52,430 L55,455 L82,455 L85,430 L85,385 L55,385 Z',
    'shin-right': 'M145,385 L148,430 L145,455 L118,455 L115,430 L115,385 L145,385 Z',
    // Ankles
    'ankle-left': 'M52,455 L50,475 Q48,485 55,490 L82,490 Q88,485 86,475 L82,455 L52,455 Z',
    'ankle-right': 'M148,455 L150,475 Q152,485 145,490 L118,490 Q112,485 114,475 L118,455 L148,455 Z',
    // Feet
    'foot-left': 'M50,490 L45,520 L48,535 L55,540 L75,538 L82,530 L85,520 L82,490 L50,490 Z',
    'foot-right': 'M150,490 L155,520 L152,535 L145,540 L125,538 L118,530 L115,520 L118,490 L150,490 Z',
  },
  back: {
    // Head
    head: 'M100,15 C80,15 65,35 65,55 C65,80 80,95 100,95 C120,95 135,80 135,55 C135,35 120,15 100,15 Z',
    // Neck
    neck: 'M88,95 L88,115 Q88,120 93,120 L107,120 Q112,120 112,115 L112,95 Q100,105 88,95 Z',
    // Cervical Spine
    'cervical-spine': 'M95,95 L95,120 L105,120 L105,95 Q100,98 95,95 Z',
    // Shoulders (mirrored for back view)
    'shoulder-left': 'M155,120 Q165,125 170,140 L155,145 L140,135 Q130,125 125,120 L140,115 Q150,117 155,120 Z',
    'shoulder-right': 'M45,120 Q35,125 30,140 L45,145 L60,135 Q70,125 75,120 L60,115 Q50,117 45,120 Z',
    // Upper Back
    'upper-back': 'M75,120 L70,165 Q100,175 130,165 L125,120 Q112,120 100,125 Q88,120 75,120 Z',
    // Thoracic Spine
    'thoracic-spine': 'M95,120 L93,180 L107,180 L105,120 L95,120 Z',
    // Upper Arms (mirrored)
    'upper-arm-left': 'M155,145 L170,140 L180,180 L175,220 L160,220 L150,180 L140,135 L155,145 Z',
    'upper-arm-right': 'M45,145 L30,140 L20,180 L25,220 L40,220 L50,180 L60,135 L45,145 Z',
    // Elbows (mirrored)
    'elbow-left': 'M175,220 L180,235 Q182,245 178,255 L160,255 Q155,245 158,235 L160,220 L175,220 Z',
    'elbow-right': 'M25,220 L20,235 Q18,245 22,255 L40,255 Q45,245 42,235 L40,220 L25,220 Z',
    // Forearms (mirrored)
    'forearm-left': 'M178,255 L182,300 L178,320 L162,320 L158,300 L160,255 L178,255 Z',
    'forearm-right': 'M22,255 L18,300 L22,320 L38,320 L42,300 L40,255 L22,255 Z',
    // Wrists (mirrored)
    'wrist-left': 'M178,320 L180,335 L175,340 L165,340 L160,335 L162,320 L178,320 Z',
    'wrist-right': 'M22,320 L20,335 L25,340 L35,340 L40,335 L38,320 L22,320 Z',
    // Hands (mirrored)
    'hand-left': 'M180,335 L185,360 L182,375 L175,380 L170,375 L168,365 L165,380 L160,378 L158,365 L155,340 L165,340 L175,340 L180,335 Z',
    'hand-right': 'M20,335 L15,360 L18,375 L25,380 L30,375 L32,365 L35,380 L40,378 L42,365 L45,340 L35,340 L25,340 L20,335 Z',
    // Mid Back
    'mid-back': 'M70,165 L68,210 Q100,220 132,210 L130,165 Q100,175 70,165 Z',
    // Lumbar Spine
    'lumbar-spine': 'M93,180 L92,245 L108,245 L107,180 L93,180 Z',
    // Lower Back
    'lower-back': 'M68,210 L65,250 Q100,260 135,250 L132,210 Q100,220 68,210 Z',
    // Sacrum
    sacrum: 'M92,245 L90,275 Q100,280 110,275 L108,245 L92,245 Z',
    // Hips (mirrored)
    'hip-left': 'M128,250 L140,275 L130,290 L110,285 Q110,260 128,250 Z',
    'hip-right': 'M72,250 L60,275 L70,290 L90,285 Q90,260 72,250 Z',
    // Thighs (mirrored)
    'thigh-left': 'M140,275 L145,330 L140,355 L115,355 L110,330 L110,285 L130,290 L140,275 Z',
    'thigh-right': 'M60,275 L55,330 L60,355 L85,355 L90,330 L90,285 L70,290 L60,275 Z',
    // Calves
    'calf-left': 'M145,395 L148,440 L145,465 L118,465 L115,440 L115,395 L145,395 Z',
    'calf-right': 'M55,395 L52,440 L55,465 L82,465 L85,440 L85,395 L55,395 Z',
    // Knees (mirrored)
    'knee-left': 'M145,355 L148,375 Q150,385 145,395 L115,395 Q110,385 112,375 L115,355 L145,355 Z',
    'knee-right': 'M55,355 L52,375 Q50,385 55,395 L85,395 Q90,385 88,375 L85,355 L55,355 Z',
    // Ankles (mirrored)
    'ankle-left': 'M148,465 L150,485 Q152,495 145,500 L118,500 Q112,495 114,485 L118,465 L148,465 Z',
    'ankle-right': 'M52,465 L50,485 Q48,495 55,500 L82,500 Q88,495 86,485 L82,465 L52,465 Z',
    // Feet (mirrored)
    'foot-left': 'M150,500 L155,530 L152,545 L145,550 L125,548 L118,540 L115,530 L118,500 L150,500 Z',
    'foot-right': 'M50,500 L45,530 L48,545 L55,550 L75,548 L82,540 L85,530 L82,500 L50,500 Z',
  },
  left: {
    // Head (side view)
    head: 'M80,15 C60,20 50,40 52,60 C55,85 70,95 90,95 Q100,90 105,80 Q110,65 105,45 Q100,20 80,15 Z',
    // Neck
    neck: 'M90,95 L95,115 L105,118 L110,115 L108,95 Q100,92 90,95 Z',
    // Cervical Spine
    'cervical-spine': 'M95,95 L100,120 L108,118 L105,93 Q100,92 95,95 Z',
    // Shoulder
    'shoulder-left': 'M95,118 L85,130 L80,150 L95,155 L110,145 L115,125 L105,118 L95,118 Z',
    // Chest (side)
    chest: 'M80,150 L75,190 L85,195 L105,195 L110,145 L95,155 L80,150 Z',
    // Upper Arm
    'upper-arm-left': 'M80,150 L70,170 L60,210 L70,230 L85,225 L95,190 L95,155 L80,150 Z',
    // Elbow
    'elbow-left': 'M60,210 L55,230 Q52,245 58,255 L78,250 Q82,240 80,225 L70,230 L60,210 Z',
    // Forearm
    'forearm-left': 'M58,255 L52,300 L55,320 L75,315 L78,295 L78,250 L58,255 Z',
    // Wrist
    'wrist-left': 'M52,320 L50,338 L55,345 L72,342 L75,335 L75,315 L55,320 L52,320 Z',
    // Hand
    'hand-left': 'M50,338 L45,365 L48,380 L60,385 L72,378 L75,355 L72,342 L55,345 L50,338 Z',
    // Thoracic Spine
    'thoracic-spine': 'M100,120 L95,180 L108,182 L112,125 L100,120 Z',
    // Lumbar Spine
    'lumbar-spine': 'M95,180 L90,245 L105,248 L108,182 L95,180 Z',
    // Abdomen (side)
    abdomen: 'M75,190 L70,240 L85,250 L105,248 L105,195 L85,195 L75,190 Z',
    // Hip
    'hip-left': 'M70,240 L65,275 L80,290 L105,285 L105,248 L85,250 L70,240 Z',
    // Thigh
    'thigh-left': 'M65,275 L55,340 L65,360 L95,355 L105,310 L105,285 L80,290 L65,275 Z',
    // Knee
    'knee-left': 'M55,340 L50,370 Q48,385 55,395 L92,390 Q98,378 95,365 L95,355 L65,360 L55,340 Z',
    // Shin (front of lower leg)
    'shin-left': 'M55,395 L52,440 L58,470 L80,465 L85,430 L92,390 L55,395 Z',
    // Calf (back of lower leg)
    'calf-left': 'M92,390 L100,420 L98,460 L80,465 L58,470 L55,395 L92,390 Z',
    // Ankle
    'ankle-left': 'M52,470 L48,495 Q46,505 55,510 L85,505 Q92,498 90,488 L80,465 L58,470 L52,470 Z',
    // Foot
    'foot-left': 'M48,495 L40,530 L45,545 L75,550 L95,540 L90,515 L85,505 L55,510 L48,495 Z',
  },
  right: {
    // Head (side view - mirrored)
    head: 'M120,15 C140,20 150,40 148,60 C145,85 130,95 110,95 Q100,90 95,80 Q90,65 95,45 Q100,20 120,15 Z',
    // Neck
    neck: 'M110,95 L105,115 L95,118 L90,115 L92,95 Q100,92 110,95 Z',
    // Cervical Spine
    'cervical-spine': 'M105,95 L100,120 L92,118 L95,93 Q100,92 105,95 Z',
    // Shoulder
    'shoulder-right': 'M105,118 L115,130 L120,150 L105,155 L90,145 L85,125 L95,118 L105,118 Z',
    // Chest (side)
    chest: 'M120,150 L125,190 L115,195 L95,195 L90,145 L105,155 L120,150 Z',
    // Upper Arm
    'upper-arm-right': 'M120,150 L130,170 L140,210 L130,230 L115,225 L105,190 L105,155 L120,150 Z',
    // Elbow
    'elbow-right': 'M140,210 L145,230 Q148,245 142,255 L122,250 Q118,240 120,225 L130,230 L140,210 Z',
    // Forearm
    'forearm-right': 'M142,255 L148,300 L145,320 L125,315 L122,295 L122,250 L142,255 Z',
    // Wrist
    'wrist-right': 'M148,320 L150,338 L145,345 L128,342 L125,335 L125,315 L145,320 L148,320 Z',
    // Hand
    'hand-right': 'M150,338 L155,365 L152,380 L140,385 L128,378 L125,355 L128,342 L145,345 L150,338 Z',
    // Thoracic Spine
    'thoracic-spine': 'M100,120 L105,180 L92,182 L88,125 L100,120 Z',
    // Lumbar Spine
    'lumbar-spine': 'M105,180 L110,245 L95,248 L92,182 L105,180 Z',
    // Abdomen (side)
    abdomen: 'M125,190 L130,240 L115,250 L95,248 L95,195 L115,195 L125,190 Z',
    // Hip
    'hip-right': 'M130,240 L135,275 L120,290 L95,285 L95,248 L115,250 L130,240 Z',
    // Thigh
    'thigh-right': 'M135,275 L145,340 L135,360 L105,355 L95,310 L95,285 L120,290 L135,275 Z',
    // Knee
    'knee-right': 'M145,340 L150,370 Q152,385 145,395 L108,390 Q102,378 105,365 L105,355 L135,360 L145,340 Z',
    // Shin (front of lower leg)
    'shin-right': 'M145,395 L148,440 L142,470 L120,465 L115,430 L108,390 L145,395 Z',
    // Calf (back of lower leg)
    'calf-right': 'M108,390 L100,420 L102,460 L120,465 L142,470 L145,395 L108,390 Z',
    // Ankle
    'ankle-right': 'M148,470 L152,495 Q154,505 145,510 L115,505 Q108,498 110,488 L120,465 L142,470 L148,470 Z',
    // Foot
    'foot-right': 'M152,495 L160,530 L155,545 L125,550 L105,540 L110,515 L115,505 L145,510 L152,495 Z',
  },
};

// View labels
const VIEW_LABELS: Record<BodyView, string> = {
  front: 'Przód',
  back: 'Tył',
  left: 'Lewy bok',
  right: 'Prawy bok',
};

export function BodyMapSVG({
  view,
  painPoints,
  painAreas,
  highlightedRegion,
  onRegionClick,
  onRegionHover,
  onCanvasClick,
  onCanvasMove,
  onCanvasStart,
  onCanvasEnd,
  isDrawing = false,
  drawingSettings,
  className,
}: BodyMapSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Get paths for current view
  const paths = BODY_PATHS[view];

  // Filter pain points and areas for current view
  const visiblePoints = useMemo(
    () => painPoints.filter((p) => p.view === view),
    [painPoints, view]
  );

  const visibleAreas = useMemo(
    () => painAreas.filter((a) => a.view === view),
    [painAreas, view]
  );

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };

      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
      const y = ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;

      return {
        x: (x / VIEWBOX_WIDTH) * 100,
        y: (y / VIEWBOX_HEIGHT) * 100,
      };
    },
    []
  );

  // Event handlers with unified touch/mouse support
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      onCanvasStart?.();
      onCanvasClick?.(x, y);
    },
    [screenToSVG, onCanvasStart, onCanvasClick]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      onCanvasMove?.(x, y);
    },
    [isDrawing, screenToSVG, onCanvasMove]
  );

  const handlePointerUp = useCallback(() => {
    onCanvasEnd?.();
  }, [onCanvasEnd]);

  const handleRegionClick = useCallback(
    (regionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (Object.keys(ANATOMICAL_REGIONS).includes(regionId)) {
        onRegionClick?.(regionId as AnatomicalRegionId);
      }
    },
    [onRegionClick]
  );

  const handleRegionHover = useCallback(
    (regionId: string | null) => {
      if (regionId && Object.keys(ANATOMICAL_REGIONS).includes(regionId)) {
        onRegionHover?.(regionId as AnatomicalRegionId);
      } else {
        onRegionHover?.(null);
      }
    },
    [onRegionHover]
  );

  // Render a pain point marker
  const renderPainPoint = useCallback((point: PainPoint) => {
    const painType = PAIN_TYPES[point.painType];
    const intensityColor = PAIN_INTENSITY_COLORS[point.intensity];
    const x = (point.x / 100) * VIEWBOX_WIDTH;
    const y = (point.y / 100) * VIEWBOX_HEIGHT;
    const size = 6 + point.intensity * 0.8;

    return (
      <g key={point.id} className="pain-point">
        {/* Glow effect */}
        <circle
          cx={x}
          cy={y}
          r={size + 4}
          fill={painType.color}
          opacity={0.3}
          filter="url(#glow)"
        />
        {/* Main circle */}
        <circle
          cx={x}
          cy={y}
          r={size}
          fill={intensityColor.bg}
          stroke={intensityColor.border}
          strokeWidth="1.5"
          className="transition-transform hover:scale-110"
        />
        {/* Pain type symbol */}
        <text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={point.intensity > 6 ? 'white' : 'black'}
          fontSize="8"
          fontWeight="bold"
          className="pointer-events-none select-none"
        >
          {painType.symbol}
        </text>
      </g>
    );
  }, []);

  // Render a highlighted region (for areas)
  const renderPainArea = useCallback((area: PainArea) => {
    const path = paths[area.regionId as keyof typeof paths];
    if (!path) return null;

    const intensityColor = PAIN_INTENSITY_COLORS[area.intensity];
    const painType = PAIN_TYPES[area.painType];

    return (
      <path
        key={area.id}
        d={path}
        fill={intensityColor.bg}
        fillOpacity={0.5}
        stroke={painType.color}
        strokeWidth="2"
        strokeDasharray={area.painType === 'radiating' ? '5,3' : undefined}
        className="pointer-events-none"
      />
    );
  }, [paths]);

  return (
    <div className={cn('relative', className)}>
      {/* View label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <span className="px-3 py-1.5 rounded-full bg-surface-light/90 backdrop-blur-sm text-xs font-medium text-muted-foreground border border-border/40 shadow-sm">
          {VIEW_LABELS[view]}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={cn(
          'w-full h-auto max-h-[500px] rounded-2xl border border-border/60 bg-gradient-to-b from-surface via-surface to-surface-light transition-colors touch-none',
          drawingSettings?.tool === 'point' && 'cursor-crosshair',
          drawingSettings?.tool === 'brush' && 'cursor-cell',
          drawingSettings?.tool === 'eraser' && 'cursor-pointer',
          drawingSettings?.tool === 'region' && 'cursor-pointer',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Definitions */}
        <defs>
          {/* Background gradient */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--surface-light, #2a2a2a)" />
            <stop offset="100%" stopColor="var(--surface, #1a1a1a)" />
          </linearGradient>
          {/* Glow filter for pain points */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Highlight gradient for hover */}
          <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary, #22c55e)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary, #22c55e)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="transparent" />

        {/* Pain areas (highlighted regions) */}
        {visibleAreas.map(renderPainArea)}

        {/* Body regions */}
        <g className="body-regions">
          {Object.entries(paths).map(([regionId, pathData]) => {
            const isHighlighted = highlightedRegion === regionId;
            const hasArea = visibleAreas.some((a) => a.regionId === regionId);
            const region = ANATOMICAL_REGIONS[regionId as AnatomicalRegionId];

            return (
              <path
                key={regionId}
                d={pathData}
                fill={isHighlighted ? 'url(#highlightGradient)' : hasArea ? 'transparent' : 'url(#bodyGradient)'}
                stroke={isHighlighted ? 'var(--primary, #22c55e)' : '#404040'}
                strokeWidth={isHighlighted ? '2' : '1'}
                className={cn(
                  'transition-all duration-200',
                  onRegionClick && 'cursor-pointer hover:stroke-primary/60 hover:stroke-[1.5]'
                )}
                onClick={(e) => handleRegionClick(regionId, e)}
                onMouseEnter={() => handleRegionHover(regionId)}
                onMouseLeave={() => handleRegionHover(null)}
              >
                {region && <title>{region.namePolish}</title>}
              </path>
            );
          })}
        </g>

        {/* Pain points */}
        <g className="pain-points">
          {visiblePoints.map(renderPainPoint)}
        </g>

        {/* Drawing preview cursor */}
        {isDrawing && drawingSettings && (
          <circle
            cx={VIEWBOX_WIDTH / 2}
            cy={VIEWBOX_HEIGHT / 2}
            r={drawingSettings.brushSize / 2}
            fill="none"
            stroke={PAIN_TYPES[drawingSettings.painType].color}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.5"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
}





