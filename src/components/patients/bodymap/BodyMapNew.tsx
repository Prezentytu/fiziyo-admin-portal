'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type {
  BodyView,
  PainPoint,
  PainArea,
  PainSession,
  DrawingSettings,
  DrawingTool,
  PainTypeId,
  AnatomicalRegionId,
  BodyMapProps,
} from '@/types/painMap';

import { BodyMapSVG } from './BodyMapSVG';
import { BodyMapToolbar } from './BodyMapToolbar';
import { BodyMapHistory } from './BodyMapHistory';
import { BodyMapExercises } from './BodyMapExercises';
import { BodyMapExport } from './BodyMapExport';
import { ANATOMICAL_REGIONS, PAIN_TYPES, PAIN_INTENSITY_COLORS } from './BodyMapRegions';

// Generate unique ID
function generateId(): string {
  return `pain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default drawing settings
const DEFAULT_SETTINGS: DrawingSettings = {
  tool: 'point',
  painType: 'dull',
  intensity: 5,
  brushSize: 15,
};

export function BodyMapNew({
  patientId,
  sessions = [],
  currentSession,
  onSave,
  onSessionChange,
  readOnly = false,
  className,
  showHistory = true,
  showSuggestedExercises = false,
}: BodyMapProps) {
  // State
  const [view, setView] = useState<BodyView>('front');
  const [painPoints, setPainPoints] = useState<PainPoint[]>(currentSession?.painPoints || []);
  const [painAreas, setPainAreas] = useState<PainArea[]>(currentSession?.painAreas || []);
  const [settings, setSettings] = useState<DrawingSettings>(DEFAULT_SETTINGS);
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlightedRegion, setHighlightedRegion] = useState<AnatomicalRegionId | null>(null);
  const [notes, setNotes] = useState(currentSession?.notes || '');

  // History for undo/redo
  const [history, setHistory] = useState<{ points: PainPoint[]; areas: PainArea[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs for drawing
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Sync with external session
  useEffect(() => {
    if (currentSession) {
      setPainPoints(currentSession.painPoints || []);
      setPainAreas(currentSession.painAreas || []);
      setNotes(currentSession.notes || '');
    }
  }, [currentSession]);

  // Notify parent of changes
  useEffect(() => {
    onSessionChange?.({
      painPoints,
      painAreas,
      notes,
    });
  }, [painPoints, painAreas, notes, onSessionChange]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ points: [...painPoints], areas: [...painAreas] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, painPoints, painAreas]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setPainPoints(prev.points);
      setPainAreas(prev.areas);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setPainPoints(next.points);
      setPainAreas(next.areas);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Add pain point
  const addPainPoint = useCallback(
    (x: number, y: number) => {
      if (readOnly || settings.tool === 'eraser') return;

      // Check for nearby existing point
      const existingNear = painPoints.find(
        (p) =>
          p.view === view &&
          Math.hypot((p.x - x), (p.y - y)) < (settings.tool === 'brush' ? settings.brushSize / 5 : 3)
      );

      if (existingNear && settings.tool === 'brush') return;

      const newPoint: PainPoint = {
        id: generateId(),
        x,
        y,
        view,
        painType: settings.painType,
        intensity: settings.intensity,
        timestamp: new Date().toISOString(),
      };

      setPainPoints((prev) => [...prev, newPoint]);
    },
    [readOnly, settings, view, painPoints]
  );

  // Handle region click (for region tool)
  const handleRegionClick = useCallback(
    (regionId: AnatomicalRegionId) => {
      if (readOnly) return;

      if (settings.tool === 'region') {
        // Toggle area
        const existingArea = painAreas.find(
          (a) => a.regionId === regionId && a.view === view
        );

        if (existingArea) {
          // Update existing
          setPainAreas((prev) =>
            prev.map((a) =>
              a.id === existingArea.id
                ? { ...a, painType: settings.painType, intensity: settings.intensity }
                : a
            )
          );
        } else {
          // Add new
          const newArea: PainArea = {
            id: generateId(),
            regionId,
            view,
            painType: settings.painType,
            intensity: settings.intensity,
            timestamp: new Date().toISOString(),
          };
          setPainAreas((prev) => [...prev, newArea]);
        }
        saveToHistory();
      } else if (settings.tool === 'eraser') {
        // Remove area for this region
        setPainAreas((prev) =>
          prev.filter((a) => !(a.regionId === regionId && a.view === view))
        );
        saveToHistory();
      }
    },
    [readOnly, settings, view, painAreas, saveToHistory]
  );

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (readOnly) return;

      if (settings.tool === 'point' || settings.tool === 'brush') {
        addPainPoint(x, y);
        lastPointRef.current = { x, y };
      } else if (settings.tool === 'eraser') {
        // Remove nearby points
        setPainPoints((prev) =>
          prev.filter(
            (p) =>
              p.view !== view ||
              Math.hypot((p.x - x), (p.y - y)) > 5
          )
        );
      }
    },
    [readOnly, settings.tool, addPainPoint, view]
  );

  // Handle canvas move (for drawing)
  const handleCanvasMove = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || readOnly) return;

      if (settings.tool === 'brush') {
        addPainPoint(x, y);
      } else if (settings.tool === 'eraser') {
        setPainPoints((prev) =>
          prev.filter(
            (p) =>
              p.view !== view ||
              Math.hypot((p.x - x), (p.y - y)) > 3
          )
        );
      }
    },
    [isDrawing, readOnly, settings.tool, addPainPoint, view]
  );

  // Handle drawing start
  const handleCanvasStart = useCallback(() => {
    setIsDrawing(true);
  }, []);

  // Handle drawing end
  const handleCanvasEnd = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
    if (painPoints.length > 0 || painAreas.length > 0) {
      saveToHistory();
    }
  }, [painPoints.length, painAreas.length, saveToHistory]);

  // Clear current view
  const handleClearView = useCallback(() => {
    setPainPoints((prev) => prev.filter((p) => p.view !== view));
    setPainAreas((prev) => prev.filter((a) => a.view !== view));
    saveToHistory();
  }, [view, saveToHistory]);

  // Clear all
  const handleClearAll = useCallback(() => {
    setPainPoints([]);
    setPainAreas([]);
    saveToHistory();
  }, [saveToHistory]);

  // Save session
  const handleSave = useCallback(() => {
    if (!onSave || (painPoints.length === 0 && painAreas.length === 0)) return;

    const session: PainSession = {
      id: currentSession?.id || generateId(),
      patientId,
      date: new Date().toISOString(),
      painPoints,
      painAreas,
      notes,
    };

    onSave(session);
  }, [onSave, patientId, painPoints, painAreas, notes, currentSession]);

  // Load session from history
  const handleSelectSession = useCallback((session: PainSession) => {
    setPainPoints(session.painPoints || []);
    setPainAreas(session.painAreas || []);
    setNotes(session.notes || '');
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const allIntensities = [
      ...painPoints.map((p) => p.intensity),
      ...painAreas.map((a) => a.intensity),
    ];
    return {
      totalMarks: painPoints.length + painAreas.length,
      pointsPerView: {
        front: painPoints.filter((p) => p.view === 'front').length,
        back: painPoints.filter((p) => p.view === 'back').length,
        left: painPoints.filter((p) => p.view === 'left').length,
        right: painPoints.filter((p) => p.view === 'right').length,
      },
      averageIntensity:
        allIntensities.length > 0
          ? Math.round((allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length) * 10) / 10
          : 0,
      maxIntensity: allIntensities.length > 0 ? Math.max(...allIntensities) : 0,
    };
  }, [painPoints, painAreas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      // Number keys for intensity
      if (e.key >= '1' && e.key <= '9') {
        setSettings((prev) => ({ ...prev, intensity: parseInt(e.key) }));
        return;
      }
      if (e.key === '0') {
        setSettings((prev) => ({ ...prev, intensity: 10 }));
        return;
      }

      // Tool shortcuts
      if (e.key === 'p') setSettings((prev) => ({ ...prev, tool: 'point' }));
      if (e.key === 'r') setSettings((prev) => ({ ...prev, tool: 'region' }));
      if (e.key === 'b') setSettings((prev) => ({ ...prev, tool: 'brush' }));
      if (e.key === 'e') setSettings((prev) => ({ ...prev, tool: 'eraser' }));

      // View shortcuts
      if (e.key === 'f') setView('front');
      if (e.key === 't') setView('back');
      if (e.key === 'l') setView('left');
      if (e.key === 'h') setView('right');

      // Undo/Redo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, handleUndo, handleRedo]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {!readOnly && (
        <BodyMapToolbar
          settings={settings}
          onSettingsChange={setSettings}
          currentView={view}
          onViewChange={setView}
          onClear={handleClearAll}
          onClearView={handleClearView}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          disabled={readOnly}
        />
      )}

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr,300px]">
        {/* Body Map SVG */}
        <div className="space-y-4">
          <BodyMapSVG
            view={view}
            painPoints={painPoints}
            painAreas={painAreas}
            highlightedRegion={highlightedRegion}
            onRegionClick={handleRegionClick}
            onRegionHover={setHighlightedRegion}
            onCanvasClick={handleCanvasClick}
            onCanvasMove={handleCanvasMove}
            onCanvasStart={handleCanvasStart}
            onCanvasEnd={handleCanvasEnd}
            isDrawing={isDrawing}
            drawingSettings={settings}
          />

          {/* Notes */}
          {!readOnly && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Notatki do sesji
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatkowe obserwacje, okoliczności powstania bólu..."
                className="min-h-[80px] resize-none"
              />
            </div>
          )}

          {/* Save and Export buttons */}
          {!readOnly && (
            <div className="flex gap-2">
              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={painPoints.length === 0 && painAreas.length === 0}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Zapisz sesję
                </Button>
              )}
              {(painPoints.length > 0 || painAreas.length > 0) && (
                <BodyMapExport
                  session={{
                    id: currentSession?.id || generateId(),
                    patientId,
                    date: new Date().toISOString(),
                    painPoints,
                    painAreas,
                    notes,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Statistics */}
          {(painPoints.length > 0 || painAreas.length > 0) && (
            <Card className="border-border/40">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Statystyki</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-surface-light">
                    <p className="text-xl font-bold text-foreground">{stats.totalMarks}</p>
                    <p className="text-[10px] text-muted-foreground">Oznaczeń</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-surface-light">
                    <p
                      className="text-xl font-bold"
                      style={{ color: PAIN_INTENSITY_COLORS[Math.round(stats.averageIntensity) || 1].bg }}
                    >
                      {stats.averageIntensity}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Śr. intensywność</p>
                  </div>
                </div>

                {/* Per-view breakdown */}
                <div className="flex flex-wrap gap-1">
                  {(['front', 'back', 'left', 'right'] as BodyView[]).map((v) => (
                    <Badge
                      key={v}
                      variant={view === v ? 'default' : 'secondary'}
                      className="text-[10px] cursor-pointer"
                      onClick={() => setView(v)}
                    >
                      {v === 'front' ? 'Przód' : v === 'back' ? 'Tył' : v === 'left' ? 'Lewo' : 'Prawo'}:{' '}
                      {stats.pointsPerView[v] + painAreas.filter((a) => a.view === v).length}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested exercises based on pain regions */}
          {showSuggestedExercises && (painPoints.length > 0 || painAreas.length > 0) && (
            <BodyMapExercises
              painPoints={painPoints}
              painAreas={painAreas}
              onAddToSet={(exerciseIds) => {
                console.log('Add to set:', exerciseIds);
                // TODO: Integrate with assignment wizard
              }}
              onCreateSetFromExercises={(exerciseIds) => {
                console.log('Create set from:', exerciseIds);
                // TODO: Integrate with set creation wizard
              }}
            />
          )}

          {/* Highlighted region info */}
          {highlightedRegion && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-primary">
                  {ANATOMICAL_REGIONS[highlightedRegion]?.namePolish}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kliknij aby zaznaczyć ten region (tryb: {settings.tool === 'region' ? 'aktywny' : 'nieaktywny'})
                </p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {showHistory && sessions.length > 0 && (
            <BodyMapHistory
              sessions={sessions}
              currentSession={currentSession}
              onSelectSession={handleSelectSession}
            />
          )}
        </div>
      </div>
    </div>
  );
}
