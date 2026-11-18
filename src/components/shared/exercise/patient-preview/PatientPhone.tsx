'use client';

import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleCheck,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Undo2,
  Video,
  Volume2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  formatClock,
  MAX_PREVIEW_REP_TILES,
  type PatientPreviewDetails,
  type PatientPreviewFrame,
  type PatientPreviewTile,
} from './patientPreviewModel';

export type PatientPhoneTheme = 'light' | 'dark';
export type PatientPhoneProgress = 'tiles' | 'bar';
export type PatientPhoneButtons = 'pause' | 'all';

interface PatientPhoneProps {
  readonly frame: PatientPreviewFrame;
  readonly exerciseName: string;
  readonly imageUrl: string | null;
  readonly theme: PatientPhoneTheme;
  readonly progress: PatientPhoneProgress;
  readonly buttons: PatientPhoneButtons;
  /** Sekunda osi do animacji paska filmu. */
  readonly clockSec: number;
  readonly onMainPress: () => void;
  readonly onRestart: () => void;
  /** Treść rozwiniętego dolnego panelu (`ExerciseBottomSheet` w aplikacji). */
  readonly details: PatientPreviewDetails;
  readonly isSheetOpen: boolean;
  readonly onSheetToggle: () => void;
  readonly testIdPrefix: string;
}

const iconButton =
  'flex h-11 w-11 items-center justify-center rounded-full bg-[var(--pp-surface-2)] text-[var(--pp-text)]';

function SideBadge({ frame, testIdPrefix }: Readonly<{ frame: PatientPreviewFrame; testIdPrefix: string }>) {
  const side = frame.side;
  return (
    <div
      className={cn('flex h-12 shrink-0 items-center px-4', side?.side === 'right' ? 'justify-end' : 'justify-start')}
    >
      {side ? (
        <div
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--pp-cta)] px-3.5 text-[var(--pp-cta-text)]"
          data-testid={`${testIdPrefix}-side`}
        >
          {side.side === 'left' ? <ArrowLeft className="h-5 w-5" aria-hidden /> : null}
          <span className="text-xl font-bold">{side.word}</span>
          {side.detail ? <span className="text-sm font-semibold opacity-85">{side.detail}</span> : null}
          {side.side === 'right' ? <ArrowRight className="h-5 w-5" aria-hidden /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Jak w aplikacji: powyżej 15 kafelków bieżącej serii zostaje pasek. */
function tilesFit(tiles: readonly PatientPreviewTile[]): boolean {
  return tiles.every((tile) => tile.state !== 'current' || tile.reps.length <= MAX_PREVIEW_REP_TILES);
}

function SetTiles({ tiles }: Readonly<{ tiles: readonly PatientPreviewTile[] }>) {
  return (
    <div className="mx-4 flex h-11 items-stretch gap-1.5">
      {tiles.map((tile) => {
        if (tile.state === 'done') {
          return (
            <div
              key={tile.key}
              className={cn(
                'flex w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--pp-work-track)] text-[var(--pp-work-accent)]',
                tile.pairEnd && 'mr-2'
              )}
            >
              <Check className="h-4 w-4" strokeWidth={2.6} aria-label={`${tile.label} zrobione`} />
            </div>
          );
        }
        if (tile.state === 'future') {
          return (
            <div
              key={tile.key}
              className={cn(
                'flex w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--pp-surface-2)] text-sm font-semibold tabular-nums text-[var(--pp-muted)]',
                tile.pairEnd && 'mr-2'
              )}
            >
              {tile.label}
            </div>
          );
        }
        return (
          <div
            key={tile.key}
            className={cn(
              'flex min-w-0 flex-1 gap-[3px] rounded-xl border-2 border-[var(--pp-accent)] bg-[var(--pp-surface)] p-[5px]',
              tile.pairEnd && 'mr-2'
            )}
          >
            {tile.reps.map((rep, index) => (
              <div
                key={index}
                className="relative min-w-0 flex-1 overflow-hidden rounded-[5px] bg-[var(--pp-tile-empty)]"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--pp-work-fill)]"
                  style={{ width: `${Math.round(rep.work * 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-[var(--pp-rest-fill)]"
                  style={{ left: `${Math.round(rep.work * 100)}%`, width: `${Math.round(rep.rest * 100)}%` }}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PhaseCard({
  frame,
  buttons,
  onMainPress,
  testIdPrefix,
}: Readonly<{
  frame: PatientPreviewFrame;
  buttons: PatientPhoneButtons;
  onMainPress: () => void;
  testIdPrefix: string;
}>) {
  const showPlay = frame.tone === 'paused';
  const showSideButtons = frame.isManual || showPlay || buttons === 'all';
  return (
    <div className="mx-4 overflow-hidden rounded-[20px] bg-[var(--pp-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-3 px-4 pb-3.5 pt-4">
        <p
          className="line-clamp-2 min-h-11 text-lg font-semibold leading-[22px] text-[var(--pp-text)]"
          data-testid={`${testIdPrefix}-hint`}
        >
          {frame.hint}
        </p>
        <div className="h-px bg-[var(--pp-divider)]" />
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <span
              className="text-[46px] font-bold leading-[48px] tracking-tight tabular-nums text-[var(--pp-text)]"
              data-testid={`${testIdPrefix}-timer`}
            >
              {frame.timerText}
              <span className="text-[26px] font-semibold text-[var(--pp-muted)]">{frame.timerSuffix}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--pp-text)]">
              <span className="h-2 w-2 rounded-full bg-[var(--pp-accent)]" />
              {frame.phaseLabel}
            </span>
          </div>
          {showSideButtons ? (
            <div className="flex gap-2" aria-hidden>
              <span className={iconButton}>
                {frame.isManual ? <Undo2 className="h-[18px] w-[18px]" /> : <RotateCcw className="h-[18px] w-[18px]" />}
              </span>
              <span className={iconButton}>
                {frame.isManual ? <Check className="h-5 w-5" strokeWidth={2.6} /> : <SkipForward className="h-5 w-5" />}
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onMainPress}
            aria-label={showPlay ? 'Wznów' : 'Pauza'}
            className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[var(--pp-fill)] text-[var(--pp-on-fill)]"
            data-testid={`${testIdPrefix}-main-btn`}
          >
            {showPlay ? <Play className="h-6 w-6 fill-current" /> : <Pause className="h-6 w-6 fill-current" />}
          </button>
        </div>
      </div>
      <div className="h-1 bg-[var(--pp-track)]">
        <div className="h-1 bg-[var(--pp-accent)]" style={{ width: `${Math.round(frame.stepProgress * 100)}%` }} />
      </div>
    </div>
  );
}

export function PatientPhone({
  frame,
  exerciseName,
  imageUrl,
  theme,
  progress,
  buttons,
  clockSec,
  onMainPress,
  onRestart,
  details,
  isSheetOpen,
  onSheetToggle,
  testIdPrefix,
}: Readonly<PatientPhoneProps>) {
  return (
    <div
      className="patient-phone h-[780px] w-[400px] shrink-0 rounded-[58px] bg-[var(--pp-frame)] p-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.25)]"
      data-phone-theme={theme}
      data-phase={frame.tone}
      data-testid={`${testIdPrefix}-phone`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[48px] bg-[image:var(--pp-gradient)] font-sans text-[var(--pp-text)]">
        {frame.screen === 'done' ? (
          <div className="absolute inset-0 flex flex-col items-center bg-[var(--pp-bg)] px-6 pt-28 text-center">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--pp-cta)] text-[var(--pp-cta-text)]">
              <Check className="h-11 w-11" strokeWidth={2.6} />
            </div>
            <h3 className="mt-4 text-[28px] font-extrabold">Świetna robota!</h3>
            <p className="mt-1.5 text-[15px] text-[var(--pp-muted)]">{exerciseName}</p>
            <button
              type="button"
              onClick={onRestart}
              className="mt-8 h-12 rounded-full bg-[var(--pp-surface-2)] px-6 text-[15px] font-semibold text-[var(--pp-text)]"
              data-testid={`${testIdPrefix}-restart-btn`}
            >
              Powtórz ćwiczenie
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col">
            <div className="h-[54px] shrink-0" />
            <div className="flex h-12 shrink-0 items-center justify-between px-4" aria-hidden>
              <ChevronLeft className="h-6 w-6" strokeWidth={2.4} />
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center">
                  <Volume2 className="h-[22px] w-[22px]" />
                </span>
                <span className={iconButton}>
                  <Settings className="h-[22px] w-[22px]" />
                </span>
              </div>
            </div>

            <SideBadge frame={frame} testIdPrefix={testIdPrefix} />

            <div className="relative mx-4 mt-1 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[18px] bg-[var(--pp-media)]">
              {imageUrl ? (
                <Image src={imageUrl} alt="" fill className="object-contain" sizes="360px" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--pp-media-text)]">
                  <Video className="h-11 w-11" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">Film ćwiczenia</span>
                </div>
              )}
              <div className="absolute inset-x-3.5 bottom-3.5 h-[3px] rounded-full bg-[var(--pp-surface)]/40">
                <div
                  className="h-[3px] rounded-full bg-[var(--pp-fill)]"
                  style={{ width: `${Math.round(((Math.max(0, clockSec) % 12) / 12) * 100)}%` }}
                />
              </div>
            </div>
            <div className="h-[22px] shrink-0" />

            <div className="flex shrink-0 flex-col pb-[104px]">
              {frame.screen === 'start' ? (
                <div className="mx-4 flex flex-col items-center gap-3.5 rounded-[20px] bg-[var(--pp-surface)] px-4 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                  <span className="text-lg font-semibold">Gotowe do startu</span>
                  <button
                    type="button"
                    onClick={onMainPress}
                    className="flex h-14 items-center gap-2.5 rounded-full bg-[var(--pp-cta)] px-7 text-[17px] font-semibold text-[var(--pp-cta-text)]"
                    data-testid={`${testIdPrefix}-start-btn`}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Rozpocznij ćwiczenie
                  </button>
                </div>
              ) : (
                <>
                  <PhaseCard frame={frame} buttons={buttons} onMainPress={onMainPress} testIdPrefix={testIdPrefix} />
                  <div className="mx-5 mb-2 mt-3 flex items-baseline gap-[18px] text-[13px] text-[var(--pp-muted)]">
                    <span>
                      Seria <b className="text-base tabular-nums text-[var(--pp-text)]">{frame.set}</b> z{' '}
                      {frame.setsTotal}
                    </span>
                    <span className="flex-1">
                      Powtórzenie <b className="text-base tabular-nums text-[var(--pp-text)]">{frame.rep}</b> z{' '}
                      {frame.repsTotal}
                    </span>
                    <span className="tabular-nums">{formatClock(frame.remainingSec)}</span>
                  </div>
                  {progress === 'tiles' && tilesFit(frame.tiles) ? (
                    <SetTiles tiles={frame.tiles} />
                  ) : (
                    <div className="mx-4 flex h-11 items-center">
                      <div className="h-3 w-full overflow-hidden rounded-md bg-[var(--pp-track)]">
                        <div
                          className="h-3 bg-[var(--pp-fill)]"
                          style={{ width: `${Math.round(frame.setProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {frame.screen === 'sideSwitch' ? (
              <div
                className="absolute inset-x-0 bottom-[92px] top-[102px] flex flex-col items-center justify-center gap-1.5 bg-[var(--pp-bg)] px-6 text-center"
                data-testid={`${testIdPrefix}-side-switch`}
              >
                <CircleCheck className="h-16 w-16 fill-[var(--pp-cta)] text-[var(--pp-cta-text)]" />
                <span className="text-[26px] font-extrabold">Świetnie!</span>
                <span className="text-base text-[var(--pp-muted)]">Lewa strona zrobiona</span>
                <span className="my-2 h-px w-16 bg-[var(--pp-divider)]" />
                <span className="text-sm text-[var(--pp-muted)]">Teraz</span>
                <span className="text-[22px] font-bold text-[var(--pp-cta)]">→ Prawa strona</span>
                <div className="mt-2.5 flex w-full flex-col items-center gap-2 rounded-2xl bg-[var(--pp-surface)] px-4 py-3">
                  <span className="text-[13px] text-[var(--pp-muted)]">Start za</span>
                  <span className="text-[34px] font-bold tabular-nums">{Math.ceil(frame.stepRemainingSec)} s</span>
                  <div className="h-1.5 w-full rounded-full bg-[var(--pp-surface-2)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--pp-cta)]"
                      style={{ width: `${Math.round(frame.stepProgress * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="mt-2.5 flex h-[50px] items-center rounded-full bg-[var(--pp-cta)] px-7 text-[17px] font-semibold text-[var(--pp-cta-text)]">
                  Zacznij teraz →
                </span>
              </div>
            ) : null}

            <ExerciseSheet
              details={details}
              exerciseName={exerciseName}
              imageUrl={imageUrl}
              isOpen={isSheetOpen}
              onToggle={onSheetToggle}
              playing={frame.tone !== 'paused' && frame.screen !== 'start'}
              onMainPress={onMainPress}
              testIdPrefix={testIdPrefix}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseSheet({
  details,
  exerciseName,
  imageUrl,
  isOpen,
  onToggle,
  playing,
  onMainPress,
  testIdPrefix,
}: Readonly<{
  details: PatientPreviewDetails;
  exerciseName: string;
  imageUrl: string | null;
  isOpen: boolean;
  onToggle: () => void;
  playing: boolean;
  onMainPress: () => void;
  testIdPrefix: string;
}>) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 flex flex-col rounded-t-[22px] bg-[var(--pp-surface)] shadow-[0_-4px_18px_rgba(0,0,0,0.08)] transition-[top] duration-300',
        isOpen ? 'top-[54px]' : 'top-[calc(100%-92px)]'
      )}
      data-testid={`${testIdPrefix}-sheet`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Zwiń szczegóły ćwiczenia' : 'Rozwiń szczegóły ćwiczenia'}
        className="flex shrink-0 flex-col items-center"
        data-testid={`${testIdPrefix}-sheet-toggle`}
      >
        <span className="mt-2 h-[5px] w-9 rounded-full bg-[var(--pp-dot-off)]" />
        <span className="flex w-full items-center gap-3 px-[18px] py-2.5 text-left">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--pp-media)]">
            {imageUrl ? <Image src={imageUrl} alt="" fill className="object-cover" sizes="36px" /> : null}
          </span>
          <span className={cn('min-w-0 flex-1 truncate font-semibold', isOpen ? 'text-lg' : 'text-base')}>
            {exerciseName}
          </span>
          {isOpen ? (
            <ChevronDown className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          ) : (
            <ChevronUp className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          )}
        </span>
      </button>

      {isOpen ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24 pt-1 text-[15px] leading-[21px]">
            {imageUrl ? (
              <div className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--pp-media)]">
                <Image src={imageUrl} alt="" fill className="object-contain" sizes="360px" />
              </div>
            ) : null}
            {details.summary ? (
              <p className="rounded-2xl bg-[var(--pp-surface-2)] px-4 py-3">{details.summary}</p>
            ) : null}
            {details.sections.map((section) => (
              <div key={section.title} className="rounded-2xl bg-[var(--pp-surface-2)] px-4 py-3">
                <p className="mb-1 font-semibold">{section.title}</p>
                {section.lines.map((line, index) => (
                  <p key={`${section.title}-${index}`} className="text-[var(--pp-muted)]">
                    {section.numbered ? `${index + 1}. ` : ''}
                    {line}
                  </p>
                ))}
              </div>
            ))}
            <div className="pt-1">
              <p className="mb-1.5 font-semibold">Podstawowe parametry</p>
              {details.parameters.map((parameter) => (
                <div
                  key={parameter.label}
                  className="flex justify-between border-b border-[var(--pp-divider)] py-2 text-[14px]"
                >
                  <span className="text-[var(--pp-muted)]">{parameter.label}</span>
                  <span className="font-semibold tabular-nums">{parameter.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onMainPress}
            aria-label={playing ? 'Pauza' : 'Wznów'}
            className="absolute bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--pp-fill)] text-[var(--pp-on-fill)] shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
            data-testid={`${testIdPrefix}-sheet-main-btn`}
          >
            {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
          </button>
        </>
      ) : null}
    </div>
  );
}
