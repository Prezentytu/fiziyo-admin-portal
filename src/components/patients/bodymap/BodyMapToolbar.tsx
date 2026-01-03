'use client';

import { useCallback } from 'react';
import {
  Circle,
  Eraser,
  MousePointer2,
  Paintbrush,
  RotateCcw,
  Trash2,
  Undo2,
  Redo2,
  MoveHorizontal,
  ZapOff,
  Flame,
  Target,
  ArrowRight,
  Grip,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { BodyView, DrawingSettings, DrawingTool, PainTypeId } from '@/types/painMap';
import { PAIN_TYPES, PAIN_INTENSITY_COLORS } from './BodyMapRegions';

interface BodyMapToolbarProps {
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

const VIEWS: { id: BodyView; label: string }[] = [
  { id: 'front', label: 'Przód' },
  { id: 'back', label: 'Tył' },
  { id: 'left', label: 'Lewy bok' },
  { id: 'right', label: 'Prawy bok' },
];

const TOOLS: { id: DrawingTool; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'point', label: 'Punkt', icon: <Circle className="h-4 w-4" />, description: 'Zaznacz pojedynczy punkt bólu' },
  { id: 'region', label: 'Region', icon: <MousePointer2 className="h-4 w-4" />, description: 'Zaznacz cały region anatomiczny' },
  { id: 'brush', label: 'Pędzel', icon: <Paintbrush className="h-4 w-4" />, description: 'Maluj obszar bólu' },
  { id: 'line', label: 'Linia', icon: <ArrowRight className="h-4 w-4" />, description: 'Rysuj kierunek promieniowania' },
  { id: 'eraser', label: 'Gumka', icon: <Eraser className="h-4 w-4" />, description: 'Usuń zaznaczenia' },
];

// Icons for pain types
const PAIN_TYPE_ICONS: Record<PainTypeId, React.ReactNode> = {
  sharp: <ZapOff className="h-4 w-4" />,
  dull: <Target className="h-4 w-4" />,
  radiating: <ArrowRight className="h-4 w-4" />,
  tingling: <MoveHorizontal className="h-4 w-4" />,
  burning: <Flame className="h-4 w-4" />,
  stiffness: <Grip className="h-4 w-4" />,
};

export function BodyMapToolbar({
  settings,
  onSettingsChange,
  currentView,
  onViewChange,
  onClear,
  onClearView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disabled = false,
}: BodyMapToolbarProps) {
  const updateSettings = useCallback(
    (partial: Partial<DrawingSettings>) => {
      onSettingsChange({ ...settings, ...partial });
    },
    [settings, onSettingsChange]
  );

  const currentViewIndex = VIEWS.findIndex((v) => v.id === currentView);

  const handlePrevView = () => {
    const newIndex = currentViewIndex > 0 ? currentViewIndex - 1 : VIEWS.length - 1;
    onViewChange(VIEWS[newIndex].id);
  };

  const handleNextView = () => {
    const newIndex = currentViewIndex < VIEWS.length - 1 ? currentViewIndex + 1 : 0;
    onViewChange(VIEWS[newIndex].id);
  };

  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface p-3">
        {/* View navigation */}
        <div className="flex items-center gap-1 rounded-lg bg-surface-light p-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePrevView}
                  disabled={disabled}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Poprzedni widok</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Select value={currentView} onValueChange={(v) => onViewChange(v as BodyView)} disabled={disabled}>
            <SelectTrigger className="w-[100px] h-8 border-0 bg-transparent text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWS.map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleNextView}
                  disabled={disabled}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Następny widok</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Drawing tools */}
        <div className="flex items-center gap-0.5 rounded-lg bg-surface-light p-1">
          <TooltipProvider>
            {TOOLS.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => updateSettings({ tool: tool.id })}
                    disabled={disabled}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      settings.tool === tool.id
                        ? tool.id === 'eraser'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {tool.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onUndo}
                  disabled={disabled || !canUndo}
                  className="h-8 w-8"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cofnij (Ctrl+Z)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRedo}
                  disabled={disabled || !canRedo}
                  className="h-8 w-8"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ponów (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Clear actions */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearView}
                  disabled={disabled}
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
                  onClick={onClear}
                  disabled={disabled}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Wyczyść wszystko</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Pain type and intensity row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-surface p-3">
        {/* Pain type selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Typ bólu:</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-light p-1">
            <TooltipProvider>
              {(Object.entries(PAIN_TYPES) as [PainTypeId, typeof PAIN_TYPES[PainTypeId]][]).map(
                ([typeId, painType]) => (
                  <Tooltip key={typeId}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => updateSettings({ painType: typeId })}
                        disabled={disabled}
                        className={cn(
                          'p-2 rounded-md transition-all',
                          settings.painType === typeId
                            ? 'ring-2 ring-offset-1 ring-offset-surface'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{
                          backgroundColor: settings.painType === typeId ? painType.color : undefined,
                          color: settings.painType === typeId ? 'white' : undefined,
                        }}
                      >
                        <span className="text-sm font-bold">{painType.symbol}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{painType.labelPolish}</p>
                      <p className="text-xs text-muted-foreground">{painType.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Intensity slider */}
        <div className="flex items-center gap-3 flex-1 min-w-[180px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Intensywność:</span>
          <div className="flex-1 flex items-center gap-2">
            <Slider
              value={[settings.intensity]}
              onValueChange={(v: number[]) => updateSettings({ intensity: v[0] })}
              min={1}
              max={10}
              step={1}
              disabled={disabled}
              className="flex-1"
            />
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-colors"
              style={{
                backgroundColor: PAIN_INTENSITY_COLORS[settings.intensity].bg,
                color: settings.intensity > 6 ? 'white' : 'black',
              }}
            >
              {settings.intensity}
            </div>
          </div>
        </div>

        {/* Brush size (only for brush tool) */}
        {settings.tool === 'brush' && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rozmiar:</span>
              <Slider
                value={[settings.brushSize]}
                onValueChange={(v: number[]) => updateSettings({ brushSize: v[0] })}
                min={5}
                max={40}
                step={1}
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-5">{settings.brushSize}</span>
            </div>
          </>
        )}
      </div>

      {/* Pain type legend (compact) */}
      <div className="flex flex-wrap gap-3 px-1">
        <span className="text-xs text-muted-foreground">Legenda:</span>
        {(Object.entries(PAIN_TYPES) as [PainTypeId, typeof PAIN_TYPES[PainTypeId]][]).map(
          ([typeId, painType]) => (
            <div key={typeId} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: painType.color }}
              />
              <span className="text-[10px] text-muted-foreground">{painType.labelPolish}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}


