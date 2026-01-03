'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Save,
  Trash2,
  History,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Circle,
  Eraser,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Typy dla punktów bólu
export interface PainPoint {
  id: string;
  x: number;
  y: number;
  intensity: number; // 1-10
  side: 'front' | 'back' | 'left' | 'right';
  timestamp: string;
  notes?: string;
}

export interface BodyMapSession {
  id: string;
  date: string;
  painPoints: PainPoint[];
}

interface BodyMapProps {
  patientId: string;
  sessions?: BodyMapSession[];
  currentSession?: BodyMapSession;
  onSave?: (session: BodyMapSession) => void;
  readOnly?: boolean;
  className?: string;
}

// Kolory dla intensywności bólu
const PAIN_COLORS = {
  1: { bg: '#22c55e', border: '#16a34a', label: 'Bardzo niski' },
  2: { bg: '#4ade80', border: '#22c55e', label: 'Niski' },
  3: { bg: '#a3e635', border: '#84cc16', label: 'Lekki' },
  4: { bg: '#facc15', border: '#eab308', label: 'Umiarkowany' },
  5: { bg: '#fbbf24', border: '#f59e0b', label: 'Średni' },
  6: { bg: '#fb923c', border: '#f97316', label: 'Podwyższony' },
  7: { bg: '#f97316', border: '#ea580c', label: 'Wysoki' },
  8: { bg: '#ef4444', border: '#dc2626', label: 'Silny' },
  9: { bg: '#dc2626', border: '#b91c1c', label: 'Bardzo silny' },
  10: { bg: '#991b1b', border: '#7f1d1d', label: 'Ekstremalny' },
} as const;

// SVG path dla sylwetki ciała (uproszczony model)
const BODY_FRONT_PATH = `
  M 100,20
  C 85,20 75,35 75,50
  C 75,65 85,75 100,75
  C 115,75 125,65 125,50
  C 125,35 115,20 100,20
  Z
  M 100,80
  L 100,85
  C 75,90 65,100 60,130
  L 55,180
  L 60,185
  L 70,140
  L 75,180
  L 75,280
  L 80,320
  L 95,320
  L 95,280
  L 100,200
  L 105,280
  L 105,320
  L 120,320
  L 125,280
  L 125,180
  L 130,140
  L 140,185
  L 145,180
  L 140,130
  C 135,100 125,90 100,85
  Z
`;

const BODY_BACK_PATH = BODY_FRONT_PATH; // Taki sam kształt dla uproszczenia

export function BodyMap({
  patientId,
  sessions = [],
  currentSession,
  onSave,
  readOnly = false,
  className,
}: BodyMapProps) {
  // Stan
  const [painPoints, setPainPoints] = useState<PainPoint[]>(
    currentSession?.painPoints || []
  );
  const [view, setView] = useState<'front' | 'back'>('front');
  const [intensity, setIntensity] = useState(5);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = useState(20);
  const [historyIndex, setHistoryIndex] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Generowanie unikalnego ID
  const generateId = () => `pain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Dodawanie punktu bólu
  const addPainPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || tool !== 'draw') return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 340;

    // Sprawdź czy punkt jest w obszarze ciała (uproszczona logika)
    if (x < 40 || x > 160 || y < 15 || y > 325) return;

    const newPoint: PainPoint = {
      id: generateId(),
      x,
      y,
      intensity,
      side: view,
      timestamp: new Date().toISOString(),
    };

    setPainPoints(prev => [...prev, newPoint]);
  }, [intensity, view, readOnly, tool]);

  // Usuwanie punktu w trybie gumki
  const handlePointClick = useCallback((pointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool === 'erase' && !readOnly) {
      setPainPoints(prev => prev.filter(p => p.id !== pointId));
    }
  }, [tool, readOnly]);

  // Obsługa rysowania (przeciąganie)
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || readOnly || tool !== 'draw') return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 340;

    if (x < 40 || x > 160 || y < 15 || y > 325) return;

    // Sprawdź czy nie ma zbyt blisko innego punktu
    const existingNear = painPoints.find(p =>
      p.side === view &&
      Math.hypot(p.x - x, p.y - y) < brushSize / 3
    );

    if (!existingNear) {
      const newPoint: PainPoint = {
        id: generateId(),
        x,
        y,
        intensity,
        side: view,
        timestamp: new Date().toISOString(),
      };
      setPainPoints(prev => [...prev, newPoint]);
    }
  }, [isDrawing, intensity, view, readOnly, tool, brushSize, painPoints]);

  // Czyszczenie wszystkich punktów
  const clearAll = () => {
    setPainPoints([]);
  };

  // Czyszczenie bieżącego widoku
  const clearCurrentView = () => {
    setPainPoints(prev => prev.filter(p => p.side !== view));
  };

  // Zapisywanie sesji
  const handleSave = () => {
    if (onSave && painPoints.length > 0) {
      const session: BodyMapSession = {
        id: generateId(),
        date: new Date().toISOString(),
        painPoints,
      };
      onSave(session);
    }
  };

  // Filtrowane punkty dla bieżącego widoku
  const visiblePoints = painPoints.filter(p => p.side === view);

  // Kolor tła i tekstu dla intensity
  const getIntensityColor = (i: number) => PAIN_COLORS[i as keyof typeof PAIN_COLORS];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-surface p-3">
          {/* Widok przód/tył */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-light p-1">
            <button
              onClick={() => setView('front')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'front'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Przód
            </button>
            <button
              onClick={() => setView('back')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'back'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tył
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-border" />

          {/* Narzędzia */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-light p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTool('draw')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      tool === 'draw'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Rysuj punkty bólu</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTool('erase')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      tool === 'erase'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Usuń punkty</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-border" />

          {/* Intensywność bólu */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ból:</span>
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[intensity]}
                onValueChange={(v: number[]) => setIntensity(v[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                style={{
                  backgroundColor: getIntensityColor(intensity).bg,
                  color: intensity > 6 ? 'white' : 'black'
                }}
              >
                {intensity}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-border" />

          {/* Akcje */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCurrentView}
                    className="h-8 w-8"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wyczyść bieżący widok</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearAll}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wyczyść wszystko</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Zapisz */}
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={painPoints.length === 0}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Zapisz
            </Button>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 px-1">
        <span className="text-xs text-muted-foreground mr-2">Skala bólu:</span>
        {[1, 3, 5, 7, 10].map(level => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: getIntensityColor(level).bg }}
            />
            <span className="text-[10px] text-muted-foreground">
              {level === 1 && 'Minimalny'}
              {level === 3 && 'Lekki'}
              {level === 5 && 'Średni'}
              {level === 7 && 'Silny'}
              {level === 10 && 'Ekstremalny'}
            </span>
          </div>
        ))}
      </div>

      {/* Mapa ciała */}
      <div className="relative mx-auto w-full max-w-[280px]">
        {/* Etykieta widoku */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <span className="px-3 py-1 rounded-full bg-surface-light text-xs font-medium text-muted-foreground">
            {view === 'front' ? 'Przód' : 'Tył'}
          </span>
        </div>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          viewBox="0 0 200 340"
          className={cn(
            'w-full h-auto rounded-2xl border border-border/60 bg-surface transition-colors',
            !readOnly && tool === 'draw' && 'cursor-crosshair',
            !readOnly && tool === 'erase' && 'cursor-pointer',
          )}
          onClick={addPainPoint}
          onMouseDown={() => setIsDrawing(true)}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onMouseMove={handleMouseMove}
        >
          {/* Tło gradientowe */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Sylwetka ciała */}
          <g>
            {/* Głowa */}
            <ellipse
              cx="100" cy="45" rx="28" ry="32"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Szyja */}
            <rect
              x="90" y="75" width="20" height="15"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Tułów */}
            <path
              d="M 60,90 L 60,200 Q 60,210 70,210 L 90,210 L 90,310 Q 90,320 95,320 L 105,320 Q 110,320 110,310 L 110,210 L 130,210 Q 140,210 140,200 L 140,90 Q 140,85 130,85 L 70,85 Q 60,85 60,90 Z"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Lewa ręka */}
            <path
              d="M 60,90 L 45,100 L 25,160 L 20,200 L 30,205 L 45,160 L 55,115 L 60,110"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Prawa ręka */}
            <path
              d="M 140,90 L 155,100 L 175,160 L 180,200 L 170,205 L 155,160 L 145,115 L 140,110"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Lewa noga */}
            <path
              d="M 75,210 L 70,280 L 65,325 Q 65,332 75,332 L 85,332 Q 88,332 88,328 L 90,280 L 90,210"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
            {/* Prawa noga */}
            <path
              d="M 125,210 L 130,280 L 135,325 Q 135,332 125,332 L 115,332 Q 112,332 112,328 L 110,280 L 110,210"
              fill="url(#bodyGradient)"
              stroke="#404040"
              strokeWidth="2"
            />
          </g>

          {/* Punkty bólu */}
          {visiblePoints.map(point => {
            const color = getIntensityColor(point.intensity);
            const size = 8 + (point.intensity * 1.5);
            return (
              <g key={point.id} onClick={(e) => handlePointClick(point.id, e)}>
                {/* Glow effect */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size + 4}
                  fill={color.bg}
                  opacity={0.3}
                  filter="url(#glow)"
                />
                {/* Main circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size}
                  fill={color.bg}
                  stroke={color.border}
                  strokeWidth="2"
                  className={cn(
                    'transition-transform',
                    tool === 'erase' && 'cursor-pointer hover:scale-125'
                  )}
                />
                {/* Intensity label */}
                <text
                  x={point.x}
                  y={point.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={point.intensity > 6 ? 'white' : 'black'}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {point.intensity}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Przyciski nawigacji widoku */}
        {!readOnly && (
          <>
            <button
              onClick={() => setView('front')}
              disabled={view === 'front'}
              className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
                'h-8 w-8 rounded-full bg-surface-light border border-border/60',
                'flex items-center justify-center transition-all',
                view === 'front'
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-surface-hover hover:scale-110'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('back')}
              disabled={view === 'back'}
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
                'h-8 w-8 rounded-full bg-surface-light border border-border/60',
                'flex items-center justify-center transition-all',
                view === 'back'
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-surface-hover hover:scale-110'
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Statystyki */}
      {painPoints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-3 text-center">
            <p className="text-xl font-bold text-foreground">{painPoints.length}</p>
            <p className="text-xs text-muted-foreground">Punktów bólu</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface p-3 text-center">
            <p className="text-xl font-bold text-foreground">
              {painPoints.filter(p => p.side === 'front').length}
            </p>
            <p className="text-xs text-muted-foreground">Przód</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface p-3 text-center">
            <p className="text-xl font-bold text-foreground">
              {painPoints.filter(p => p.side === 'back').length}
            </p>
            <p className="text-xs text-muted-foreground">Tył</p>
          </div>
        </div>
      )}

      {/* Historia sesji (jeśli dostępna) */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Historia ({sessions.length})
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sessions.slice(0, 5).map((session, index) => (
              <button
                key={session.id}
                className={cn(
                  'flex-shrink-0 px-3 py-2 rounded-lg border border-border/60 bg-surface',
                  'text-xs transition-colors hover:bg-surface-light',
                  index === historyIndex && 'border-primary'
                )}
                onClick={() => {
                  setHistoryIndex(index);
                  setPainPoints(session.painPoints);
                }}
              >
                <span className="font-medium">
                  {new Date(session.date).toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="text-muted-foreground ml-2">
                  ({session.painPoints.length} pkt)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
