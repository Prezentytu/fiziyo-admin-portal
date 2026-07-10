'use client';

import { useEffect, useState } from 'react';
import {
  Repeat,
  Dumbbell,
  Clock,
  Timer,
  RefreshCw,
  ArrowLeftRight,
  Gauge,
  FileText,
  Volume2,
  Move,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { buildExerciseParameterGroups } from './utils/buildExerciseParameterGroups';
import type { ExerciseParameterItem } from './utils/buildExerciseParameterGroups';
import type { ExerciseFieldValueSource } from '@/components/shared/exercise/displayRegistry';
import type { ExerciseFieldKey } from '@/components/shared/exercise/displayRegistry';

const ICON_MAP: Record<string, LucideIcon> = {
  sets: Repeat,
  reps: Dumbbell,
  time: Clock,
  pause: Timer,
  tempo: RefreshCw,
  load: Dumbbell,
  side: ArrowLeftRight,
  range: Move,
  difficulty: Gauge,
  description: FileText,
  audio: Volume2,
  notes: FileText,
};

const NUMERIC_KEYS: ExerciseFieldKey[] = [
  'sets',
  'reps',
  'duration',
  'executionTime',
  'restSets',
  'restReps',
  'preparationTime',
];

const SIDE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'both', label: 'Obie strony' },
  { value: 'alternating', label: 'Naprzemiennie' },
];

const DIFFICULTY_OPTIONS: { value: string; label: string }[] = [
  { value: 'UNKNOWN', label: 'Nieokreślony' },
  { value: 'BEGINNER', label: 'Początkujący' },
  { value: 'EASY', label: 'Łatwy' },
  { value: 'MEDIUM', label: 'Średni' },
  { value: 'HARD', label: 'Trudny' },
  { value: 'EXPERT', label: 'Ekspert' },
];

export type ExerciseParameterChangeValue = string | number | null;

export interface ExerciseParameterSummaryStat {
  label: string;
  value: string;
  tooltip: string;
}

interface ExerciseParametersPanelProps {
  source: ExerciseFieldValueSource;
  editable?: boolean;
  onFieldChange?: (key: ExerciseFieldKey, value: ExerciseParameterChangeValue) => void;
  summaryStat?: ExerciseParameterSummaryStat;
}

const PRIMARY_GROUP_ID = 'dosage';

function getRawValue(key: ExerciseFieldKey, source: ExerciseFieldValueSource): string {
  switch (key) {
    case 'sets':
      return source.sets != null ? String(source.sets) : '';
    case 'reps':
      return source.reps != null ? String(source.reps) : '';
    case 'duration':
      return source.duration != null ? String(source.duration) : '';
    case 'executionTime':
      return source.executionTime != null ? String(source.executionTime) : '';
    case 'restSets':
      return source.restSets != null ? String(source.restSets) : '';
    case 'restReps':
      return source.restReps != null ? String(source.restReps) : '';
    case 'preparationTime':
      return source.preparationTime != null ? String(source.preparationTime) : '';
    case 'tempo':
      return source.tempo ?? '';
    case 'load':
      return source.loadDisplayText ?? '';
    case 'side':
      return source.side ?? 'none';
    case 'rangeOfMotion':
      return source.rangeOfMotion ?? '';
    case 'difficultyLevel':
      return source.difficultyLevel ?? 'UNKNOWN';
    default:
      return '';
  }
}

interface EditableTextValueProps {
  fieldKey: ExerciseFieldKey;
  initialValue: string;
  numeric: boolean;
  onCommit: (key: ExerciseFieldKey, value: ExerciseParameterChangeValue) => void;
}

function EditableTextValue({ fieldKey, initialValue, numeric, onCommit }: Readonly<EditableTextValueProps>) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const commit = () => {
    if (value === initialValue) return;
    if (numeric) {
      const parsed = value.trim() === '' ? null : Number(value);
      onCommit(fieldKey, parsed != null && Number.isNaN(parsed) ? null : parsed);
    } else {
      onCommit(fieldKey, value.trim() === '' ? null : value.trim());
    }
  };

  return (
    <Input
      type={numeric ? 'number' : 'text'}
      inputMode={numeric ? 'numeric' : undefined}
      min={numeric ? 0 : undefined}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      className="h-9 text-sm"
      data-testid={`exercise-param-${fieldKey}-input`}
    />
  );
}

interface EditableSelectValueProps {
  fieldKey: ExerciseFieldKey;
  value: string;
  options: { value: string; label: string }[];
  onCommit: (key: ExerciseFieldKey, value: ExerciseParameterChangeValue) => void;
}

function EditableSelectValue({ fieldKey, value, options, onCommit }: Readonly<EditableSelectValueProps>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onCommit(fieldKey, next)}
    >
      <SelectTrigger className="h-9 text-sm" data-testid={`exercise-param-${fieldKey}-select`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ExerciseParametersPanel({
  source,
  editable = false,
  onFieldChange,
  summaryStat,
}: Readonly<ExerciseParametersPanelProps>) {
  const groups = buildExerciseParameterGroups(source);
  const primaryGroup = groups.find((group) => group.id === PRIMARY_GROUP_ID);
  const secondaryGroups = groups.filter((group) => group.id !== PRIMARY_GROUP_ID);

  const renderEditor = (key: ExerciseFieldKey) => {
    if (!onFieldChange) return null;
    if (key === 'side') {
      return (
        <EditableSelectValue
          fieldKey={key}
          value={getRawValue(key, source)}
          options={SIDE_OPTIONS}
          onCommit={onFieldChange}
        />
      );
    }
    if (key === 'difficultyLevel') {
      return (
        <EditableSelectValue
          fieldKey={key}
          value={getRawValue(key, source)}
          options={DIFFICULTY_OPTIONS}
          onCommit={onFieldChange}
        />
      );
    }
    return (
      <EditableTextValue
        fieldKey={key}
        initialValue={getRawValue(key, source)}
        numeric={NUMERIC_KEYS.includes(key)}
        onCommit={onFieldChange}
      />
    );
  };

  const renderItemTile = (item: ExerciseParameterItem, emphasized: boolean) => {
    const Icon = ICON_MAP[item.iconKey] ?? Clock;
    return (
      <div
        key={item.key}
        className={cn(
          'rounded-xl',
          emphasized ? 'bg-surface p-4 shadow-sm' : 'bg-surface-light/30 p-3'
        )}
        data-testid={`exercise-param-${item.key}`}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Icon className={cn('shrink-0 text-muted-foreground/60', emphasized ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          <span
            className={cn(
              'leading-none truncate',
              emphasized ? 'text-xs font-medium text-muted-foreground' : 'text-[11px] text-muted-foreground'
            )}
          >
            {item.label}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ml-auto inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                aria-label={`Informacja: ${item.label}`}
                data-testid={`exercise-param-${item.key}-info`}
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {item.tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        {editable && onFieldChange ? (
          renderEditor(item.key)
        ) : (
          <p
            className={cn(
              'font-semibold leading-tight tabular-nums',
              emphasized ? 'text-xl' : 'text-base',
              item.isEmpty ? 'text-muted-foreground/40' : 'text-foreground'
            )}
          >
            {item.value}
          </p>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {primaryGroup && (
          <div
            className="rounded-2xl border border-primary/30 bg-primary/5 p-4"
            data-testid="exercise-detail-parameters-primary-group"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">{primaryGroup.title}</p>
            {summaryStat && (
              <div
                className="mb-2 rounded-xl bg-surface p-4 shadow-sm flex items-center justify-between"
                data-testid="exercise-param-summary-stat"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{summaryStat.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                        aria-label={`Informacja: ${summaryStat.label}`}
                        data-testid="exercise-param-summary-stat-info"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {summaryStat.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xl font-bold leading-tight tabular-nums text-foreground">{summaryStat.value}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {primaryGroup.items.map((item) => renderItemTile(item, true))}
            </div>
          </div>
        )}

        <div
          className="rounded-2xl border border-border/40 bg-surface/50 divide-y divide-border/40"
          data-testid="exercise-detail-parameters-panel"
        >
          {secondaryGroups.map((group) => (
            <div key={group.id} className="p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => renderItemTile(item, false))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
