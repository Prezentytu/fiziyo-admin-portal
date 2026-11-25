'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import { cn } from '@/lib/utils';
import {
  MAX_EXERCISE_VIDEOS,
  MAX_VIDEO_URL_LENGTH,
  addVideo,
  canAddVideo,
  getVideoUrlError,
  moveVideo,
  removeVideoAt,
  setVideoAt,
} from '@/utils/exerciseVideos';
import {
  extractVideoStartSeconds,
  formatVideoStart,
  parseVideoStartInput,
  supportsVideoStart,
  withVideoStart,
} from '@/utils/videoEmbed';

interface ExerciseVideosFieldProps {
  /** Draft rows in order; the first is the main video. May hold empty rows while the list is edited. */
  value: string[];
  dirty: boolean;
  disabled: boolean;
  onChange: (value: string[]) => void;
  inputId?: string;
  /** Test id of the first input; further rows and buttons derive theirs from it. */
  testId?: string;
  autoFocus?: boolean;
  /** Called on plain Enter in any row (Cmd/Ctrl+Enter is left to the surrounding view). */
  onSubmit?: () => void;
}

export function ExerciseVideosField({
  value,
  dirty,
  disabled,
  onChange,
  inputId = 'exercise-detail-video-url',
  testId = 'exercise-detail-video-url-input',
  autoFocus = false,
  onSubmit,
}: Readonly<ExerciseVideosFieldProps>) {
  const rows = value.length === 0 ? [''] : value;
  const hasManyRows = rows.length > 1;

  return (
    <div className="space-y-1.5" data-testid={`${testId}-list`}>
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor={inputId}>
          Link do filmu
        </Label>
        <DirtyDot active={dirty} />
      </div>
      <ul className="space-y-2">
        {rows.map((video, index) => {
          const error = getVideoUrlError(rows, index);
          const rowName = index === 0 ? 'Film główny' : `Film ${index + 1}`;
          const errorId = `${inputId}-${index}-error`;
          return (
            // Rows have no stable identity besides their position: two can hold the same text while typing.
            <li key={index} className="space-y-1">
              <div className="flex items-center gap-1">
                {hasManyRows && (
                  <span
                    className={cn(
                      'w-24 shrink-0 text-xs',
                      index === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {rowName}
                  </span>
                )}
                <Input
                  data-testid={index === 0 ? testId : `${testId}-${index}`}
                  id={index === 0 ? inputId : `${inputId}-${index}`}
                  inputMode="url"
                  value={video}
                  maxLength={MAX_VIDEO_URL_LENGTH}
                  autoFocus={autoFocus && index === 0}
                  aria-label={index === 0 ? undefined : `Link do filmu ${index + 1}`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  placeholder="https://vimeo.com/… lub https://youtu.be/…"
                  onChange={(event) => onChange(setVideoAt(value, index, event.target.value))}
                  onKeyDown={(event) => {
                    if (onSubmit && event.key === 'Enter' && !event.metaKey && !event.ctrlKey) onSubmit();
                  }}
                  disabled={disabled}
                  className={cn(
                    'h-9 min-w-0 flex-1 text-sm transition-colors',
                    dirty && 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40'
                  )}
                />
                {supportsVideoStart(video) && (
                  <VideoStartInput
                    video={video}
                    rowName={rowName}
                    disabled={disabled}
                    testId={`${testId}-start-${index}`}
                    onChange={(nextVideo) => onChange(setVideoAt(value, index, nextVideo))}
                  />
                )}
                {hasManyRows && (
                  <>
                    <Button
                      data-testid={`${testId}-up-btn-${index}`}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Przesuń wyżej: ${rowName}`}
                      disabled={disabled || index === 0}
                      onClick={() => onChange(moveVideo(rows, index, index - 1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid={`${testId}-down-btn-${index}`}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Przesuń niżej: ${rowName}`}
                      disabled={disabled || index === rows.length - 1}
                      onClick={() => onChange(moveVideo(rows, index, index + 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid={`${testId}-remove-btn-${index}`}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Usuń: ${rowName}`}
                      disabled={disabled}
                      onClick={() => onChange(removeVideoAt(rows, index))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
              {error && (
                <p id={errorId} className="text-xs text-destructive" data-testid={`${testId}-error-${index}`}>
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          data-testid={`${testId}-add-btn`}
          type="button"
          variant="plain"
          size="sm"
          disabled={disabled || !canAddVideo(rows)}
          onClick={() => onChange(addVideo(value))}
        >
          <Plus />
          Dodaj film
        </Button>
        {hasManyRows && (
          <p className="text-xs text-muted-foreground">
            Pierwszy film jest główny. Najwyżej {MAX_EXERCISE_VIDEOS} filmów.
          </p>
        )}
      </div>
    </div>
  );
}

interface VideoStartInputProps {
  video: string;
  rowName: string;
  disabled: boolean;
  testId: string;
  onChange: (video: string) => void;
}

/** Start marker of one video (SPEC-064), kept in the link itself; applied on blur or Enter. */
function VideoStartInput({ video, rowName, disabled, testId, onChange }: Readonly<VideoStartInputProps>) {
  const startSeconds = extractVideoStartSeconds(video);
  const savedText = startSeconds ? formatVideoStart(startSeconds) : '';
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? savedText;
  const isInvalid = draft !== null && parseVideoStartInput(draft) === undefined;

  const commit = () => {
    if (draft === null) return;
    const seconds = parseVideoStartInput(draft);
    if (seconds === undefined) return;
    setDraft(null);
    if (seconds !== startSeconds) onChange(withVideoStart(video, seconds));
  };

  return (
    <Input
      data-testid={testId}
      inputMode="numeric"
      value={text}
      placeholder="Start 0:00"
      title="Od którego momentu pacjent ogląda film, np. 1:30"
      aria-label={`Start filmu: ${rowName}`}
      aria-invalid={isInvalid ? true : undefined}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') setDraft(null);
      }}
      className={cn('h-9 w-24 shrink-0 text-sm tabular-nums', isInvalid && 'border-destructive')}
    />
  );
}
