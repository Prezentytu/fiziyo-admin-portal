'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListOrdered, Pause, Play, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import { polishPlural } from '@/utils/polishPlural';
import type { ExerciseExecutionCardData } from '../types';
import {
  PATIENT_PHONE_HEIGHT,
  PATIENT_PHONE_WIDTH,
  PatientPhone,
  type PatientPhoneButtons,
  type PatientPhoneProgress,
  type PatientPhoneTheme,
} from './PatientPhone';
import {
  buildPatientPreviewBlocks,
  buildPatientPreviewDetails,
  buildPatientPreviewFrame,
  buildPatientPreviewNotes,
  buildPatientPreviewScript,
  formatClock,
  resolvePatientPreviewSource,
  type PatientPreviewBlock,
  type PatientPreviewNote,
} from './patientPreviewModel';

interface PatientPreviewTabProps {
  readonly exercise: ExerciseExecutionCardData;
  readonly imageUrl: string | null;
  readonly testIdPrefix: string;
}

const TICK_MS = 250;

const BLOCK_COLOR: Record<PatientPreviewBlock['tone'], string> = {
  prepare: 'bg-[var(--pt-prepare)]',
  work: 'bg-[var(--pt-work)]',
  rest: 'bg-[var(--pt-rest)]',
  sideSwitch: 'bg-[var(--pt-switch)]',
};

const NOTE_STYLE: Record<PatientPreviewNote['level'], { tag: string; box: string; label: string }> = {
  player: { tag: 'bg-tint-muted text-tint', box: 'bg-tint-muted/40', label: 'PLAYER' },
  fix: { tag: 'bg-status-warning-muted text-status-warning', box: 'bg-status-warning-muted/40', label: 'POPRAWKA' },
  info: { tag: 'bg-fill-tertiary text-label-secondary', box: 'bg-fill-quaternary', label: 'INFO' },
};

function PanelHeader({
  title,
  onClose,
  closeIcon,
  closeLabel,
  testId,
  children,
}: Readonly<{
  title: string;
  onClose: () => void;
  closeIcon: 'left' | 'right';
  closeLabel: string;
  testId: string;
  children?: React.ReactNode;
}>) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border pl-4 pr-2">
      <h3 className="flex-1 text-base font-semibold text-foreground">{title}</h3>
      {children}
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={closeLabel} data-testid={testId}>
        {closeIcon === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </Button>
    </div>
  );
}

export function PatientPreviewTab({ exercise, imageUrl, testIdPrefix }: Readonly<PatientPreviewTabProps>) {
  const source = useMemo(() => resolvePatientPreviewSource(exercise), [exercise]);
  const [clockSec, setClockSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [theme, setTheme] = useState<PatientPhoneTheme>('light');
  const [progress, setProgress] = useState<PatientPhoneProgress>('tiles');
  const [buttons, setButtons] = useState<PatientPhoneButtons>('pause');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const phoneAreaRef = useRef<HTMLDivElement>(null);
  const [phoneScale, setPhoneScale] = useState(1);

  const script = useMemo(() => buildPatientPreviewScript(source), [source]);
  const blocks = useMemo(() => buildPatientPreviewBlocks(source, script), [source, script]);
  const notes = useMemo(() => buildPatientPreviewNotes(source, script), [source, script]);
  const details = useMemo(() => buildPatientPreviewDetails(exercise, source, script), [exercise, source, script]);
  const totalSec = script.timelineDurationSec;

  useLayoutEffect(() => {
    const phoneArea = phoneAreaRef.current;
    if (!phoneArea) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setPhoneScale(Math.min(1, width / PATIENT_PHONE_WIDTH, height / PATIENT_PHONE_HEIGHT));
      }
    });
    observer.observe(phoneArea);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setClockSec(0);
    setIsPlaying(false);
    setIsStarted(false);
    setIsPaused(false);
    setIsSheetOpen(false);
  }, [script]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setClockSec((previous) => {
        const next = previous + (TICK_MS / 1000) * speed;
        if (next >= totalSec) {
          setIsPlaying(false);
          return totalSec;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, speed, totalSec]);

  const frame = buildPatientPreviewFrame(source, script, clockSec, { started: isStarted, paused: isPaused });
  const fixCount = notes.filter((note) => note.level !== 'info').length;
  const { input } = source;

  const handlePlay = () => {
    setClockSec((previous) => (previous >= totalSec ? 0 : previous));
    setIsStarted(true);
    setIsPaused(false);
    setIsPlaying(true);
  };

  const handleMainPress = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setIsPaused(true);
      return;
    }
    handlePlay();
  };

  const handleSeek = (seconds: number) => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsStarted(seconds > 0);
    setClockSec(Math.max(0, Math.min(totalSec, seconds)));
  };

  const handleRestart = () => handleSeek(0);

  return (
    <div
      className="grid h-[820px] min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-3 bg-surface-light/30 p-3 lg:grid-cols-[minmax(0,1fr)_400px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-5"
      data-testid={`${testIdPrefix}-patient-view`}
    >
      <div
        className={cn(
          'col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col items-start',
          isOptionsOpen && 'max-lg:col-span-2',
          isFlowOpen && 'max-lg:hidden'
        )}
      >
        {isOptionsOpen ? (
          <div className="flex max-h-[30dvh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-raised lg:max-h-full">
            <PanelHeader
              title="Opcje podglądu"
              onClose={() => setIsOptionsOpen(false)}
              closeIcon="left"
              closeLabel="Zwiń opcje"
              testId={`${testIdPrefix}-options-close-btn`}
            />
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Parametry pacjenta
                </p>
                <p className="text-sm tabular-nums text-foreground">
                  {input.sets} × {source.prescribedReps}
                  {input.exerciseSide === 'both' || input.exerciseSide === 'alternating' ? ' na stronę' : ''}
                  {input.executionTimeSec > 0 ? ` · powtórzenie ${input.executionTimeSec} s` : ' · odhaczane'}
                  {` · przygotowanie ${input.preparationTime} s · przerwa ${input.restSets} s`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Te same wartości co w zakładce „Szczegóły”. Zmieniasz je w edycji ćwiczenia, zestawu albo planu.
                </p>
              </section>
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telefon pacjenta</p>
                <SegmentedControl
                  label="Motyw telefonu"
                  value={theme}
                  onChange={setTheme}
                  options={[
                    { value: 'light', label: 'Jasny' },
                    { value: 'dark', label: 'Ciemny' },
                  ]}
                  testId={`${testIdPrefix}-phone-theme`}
                />
                <SegmentedControl
                  label="Postęp serii"
                  value={progress}
                  onChange={setProgress}
                  options={[
                    { value: 'tiles', label: 'Kafelki' },
                    { value: 'bar', label: 'Pasek' },
                  ]}
                  testId={`${testIdPrefix}-phone-progress`}
                />
                <SegmentedControl
                  label="Przyciski w trakcie"
                  value={buttons}
                  onChange={setButtons}
                  options={[
                    { value: 'pause', label: 'Sama pauza' },
                    { value: 'all', label: 'Wszystkie przyciski' },
                  ]}
                  testId={`${testIdPrefix}-phone-buttons`}
                />
                <p className="text-xs text-muted-foreground">
                  Domyślnie jak w aplikacji. Pacjent zmienia to w „Ustawieniach ćwiczeń”.
                </p>
              </section>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOptionsOpen(true)}
            aria-expanded={false}
            data-testid={`${testIdPrefix}-options-btn`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Opcje
          </Button>
        )}
      </div>

      <div
        ref={phoneAreaRef}
        className="col-span-2 row-start-2 flex min-h-0 min-w-0 items-center justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1"
      >
        <PatientPhone
          scale={phoneScale}
          frame={frame}
          exerciseName={exercise.displayName}
          imageUrl={imageUrl}
          theme={theme}
          progress={progress}
          buttons={buttons}
          clockSec={clockSec}
          onMainPress={handleMainPress}
          onRestart={handleRestart}
          details={details}
          isSheetOpen={isSheetOpen}
          onSheetToggle={() => setIsSheetOpen((open) => !open)}
          testIdPrefix={`${testIdPrefix}-patient`}
        />
      </div>

      <div
        className={cn(
          'col-start-2 row-start-1 flex min-h-0 min-w-0 flex-col items-end lg:col-start-3',
          isFlowOpen && 'max-lg:col-span-2 max-lg:col-start-1',
          isOptionsOpen && !isFlowOpen && 'max-lg:hidden'
        )}
      >
        {isFlowOpen ? (
          <div className="patient-timeline flex max-h-[30dvh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-raised lg:max-h-full">
            <PanelHeader
              title="Przebieg"
              onClose={() => setIsFlowOpen(false)}
              closeIcon="right"
              closeLabel="Zwiń przebieg"
              testId={`${testIdPrefix}-flow-close-btn`}
            >
              <span className="text-sm tabular-nums text-muted-foreground">
                <b className="text-foreground">{formatClock(clockSec)}</b> / {formatClock(totalSec)}
              </span>
            </PanelHeader>
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
              <section className="space-y-3">
                <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-md">
                  {blocks.map((block) => {
                    const isPast = clockSec >= block.startSec + block.durationSec;
                    const isActive = clockSec >= block.startSec && !isPast;
                    return (
                      <div
                        key={`${block.label}-${block.startSec}`}
                        className={cn(
                          BLOCK_COLOR[block.tone],
                          block.hatched && 'patient-timeline-hatched',
                          isPast || isActive ? 'opacity-100' : 'opacity-45'
                        )}
                        style={{ flex: `${block.durationSec} 1 0`, minWidth: 2 }}
                      />
                    );
                  })}
                </div>
                <input
                  type="range"
                  min={0}
                  max={totalSec}
                  step={0.25}
                  value={clockSec}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  aria-label="Moment ćwiczenia"
                  className="w-full accent-tint"
                  data-testid={`${testIdPrefix}-flow-scrub`}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
                    data-testid={`${testIdPrefix}-flow-play-btn`}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Zatrzymaj' : 'Odtwórz'}
                  </Button>
                  <SegmentedControl
                    label="Prędkość odtwarzania"
                    value={speed}
                    onChange={setSpeed}
                    options={[
                      { value: 1, label: '1×' },
                      { value: 4, label: '4×' },
                    ]}
                    testId={`${testIdPrefix}-flow-speed`}
                  />
                </div>
                {script.timelineDurationSec !== script.plannedDurationSec ? (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Na liście pacjenta {formatClock(script.plannedDurationSec)}. Ekran „Prawa strona” (kreskowany) nie
                    wchodzi do tego czasu.
                  </p>
                ) : null}
                <div className="flex max-h-64 flex-col overflow-y-auto border-t border-border pt-1.5">
                  {blocks.map((block) => {
                    const isActive = clockSec >= block.startSec && clockSec < block.startSec + block.durationSec;
                    return (
                      <button
                        key={`${block.label}-${block.startSec}`}
                        type="button"
                        onClick={() => handleSeek(block.startSec + 0.01)}
                        className={cn(
                          'flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-fill-quaternary',
                          isActive && 'bg-tint-muted font-semibold'
                        )}
                        data-testid={`${testIdPrefix}-flow-step-${block.startSec}`}
                      >
                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', BLOCK_COLOR[block.tone])} />
                        <span className="flex-1">
                          {block.label}
                          {block.tone === 'sideSwitch' ? ' · poza czasem' : ''}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{formatClock(block.startSec)}</span>
                        <span className="w-12 text-right tabular-nums text-muted-foreground">
                          {block.durationSec} s
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              {notes.length > 0 ? (
                <section className="space-y-2" data-testid={`${testIdPrefix}-flow-notes`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Co pacjent zobaczy inaczej, niż wpisano
                  </p>
                  {notes.map((note) => (
                    <div
                      key={note.text}
                      className={cn('flex gap-3 rounded-xl px-3.5 py-3', NOTE_STYLE[note.level].box)}
                    >
                      <span
                        className={cn(
                          'flex h-[22px] shrink-0 items-center rounded-md px-2 text-[11px] font-bold tracking-wide',
                          NOTE_STYLE[note.level].tag
                        )}
                      >
                        {NOTE_STYLE[note.level].label}
                      </span>
                      <span className="text-sm leading-5 text-foreground">{note.text}</span>
                    </div>
                  ))}
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFlowOpen(true)}
            aria-expanded={false}
            data-testid={`${testIdPrefix}-flow-btn`}
          >
            <span className="tabular-nums text-muted-foreground">{formatClock(totalSec)}</span>
            Przebieg
            {fixCount > 0 ? (
              <span className="rounded-full bg-status-warning-muted px-2 text-xs font-bold text-status-warning">
                {fixCount} {polishPlural(fixCount, 'uwaga', 'uwagi', 'uwag')}
              </span>
            ) : null}
            <ListOrdered className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
