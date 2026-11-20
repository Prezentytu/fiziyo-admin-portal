'use client';

import { useMemo, useState } from 'react';
import { Clock, Flame, Loader2, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import type { ExerciseDependencyMode, ExerciseSetDependencyInput } from '@/graphql/types';
import {
  MAX_REQUIREMENTS_PER_POSITION,
  applyDependencyDraft,
  buildDependencyItem,
  buildRequirementOptions,
  hasPrerequisites,
  sanitizeRequirements,
  type DependencyDraft,
  type DependencyPosition,
  type RequirementOption,
} from '../utils/exerciseDependencies';

const MODE_OPTIONS = [
  { value: 'block' as const, label: 'Blokuje' },
  { value: 'remind' as const, label: 'Przypomina' },
];

const MODE_HINT: Record<ExerciseDependencyMode, string> = {
  block: 'Ćwiczenie czeka, aż pacjent zrobi wymagane.',
  remind: 'Pacjent zobaczy przypomnienie, ale może ćwiczyć od razu.',
};

interface ExerciseDependencyDialogProps {
  /** Edytowana pozycja; `null` = okno zamknięte. */
  readonly target: DependencyPosition | null;
  readonly positions: readonly DependencyPosition[];
  readonly saving: boolean;
  readonly onClose: () => void;
  readonly onSave: (items: ExerciseSetDependencyInput[], nextPositions: DependencyPosition[]) => Promise<boolean>;
}

/** SPEC-061 P1: rozgrzewka, „Wymaga wcześniej” i siła zależności jednej pozycji zestawu. */
export function ExerciseDependencyDialog({ target, positions, saving, onClose, onSave }: ExerciseDependencyDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-lg" data-testid="set-dependency-dialog">
        {target && (
          <DependencyEditor key={target.id} target={target} positions={positions} saving={saving} onClose={onClose} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DependencyEditorProps extends Omit<ExerciseDependencyDialogProps, 'target'> {
  readonly target: DependencyPosition;
}

function DependencyEditor({ target, positions, saving, onClose, onSave }: DependencyEditorProps) {
  const [draft, setDraft] = useState<DependencyDraft>({
    isWarmup: target.isWarmup,
    requiresMappingIds: target.requiresMappingIds,
    dependencyMode: target.dependencyMode,
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const options = useMemo(
    () => buildRequirementOptions(positions, target.id, draft.isWarmup),
    [positions, target.id, draft.isWarmup]
  );
  const names = useMemo(() => new Map(positions.map((position) => [position.id, position.name])), [positions]);
  const setHasWarmup = positions.some((position) => (position.id === target.id ? draft.isWarmup : position.isWarmup));
  const showsWarmupRequirement = !draft.isWarmup && setHasWarmup;
  const requires = sanitizeRequirements(draft.requiresMappingIds, options);
  const waitsForSomething = hasPrerequisites({ ...draft, requiresMappingIds: requires }, setHasWarmup);

  const handleSave = async () => {
    const cleaned: DependencyDraft = { ...draft, requiresMappingIds: requires };
    const saved = await onSave([buildDependencyItem(target.id, cleaned)], applyDependencyDraft(positions, target.id, cleaned));
    if (saved) onClose();
  };

  return (
    <>
      <DialogHeader className="min-w-0">
        <DialogTitle className="line-clamp-2 break-words" title={target.name}>
          Kolejność: {target.name}
        </DialogTitle>
        <DialogDescription>Co pacjent robi przed tym ćwiczeniem.</DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="flex items-start justify-between gap-4 rounded-control bg-grouped-tertiary p-3.5">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="set-dependency-warmup-switch" className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-status-warning" aria-hidden="true" />
              Rozgrzewka
            </Label>
            <p className="text-[13px] text-label-secondary">
              Pacjent zaczyna od rozgrzewki, reszta zestawu czeka na nią.
            </p>
          </div>
          <Switch
            id="set-dependency-warmup-switch"
            checked={draft.isWarmup}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, isWarmup: checked }))}
            data-testid="set-dependency-warmup-switch"
          />
        </div>

        <section className="space-y-2" aria-labelledby="set-dependency-requires-heading">
          <h3 id="set-dependency-requires-heading" className="text-[13px] font-semibold text-foreground">
            Wymaga wcześniej
          </h3>
          <ul className="space-y-1.5" data-testid="set-dependency-requires-list">
            {showsWarmupRequirement && (
              <li className="flex items-center gap-2 rounded-control bg-fill-quaternary px-3 py-2 text-[14px]">
                <Flame className="h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                <span className="min-w-0 flex-1">Rozgrzewka</span>
                <span className="shrink-0 text-[12px] text-label-secondary">zawsze przed</span>
              </li>
            )}
            {requires.map((id) => (
              <li key={id} className="flex items-center gap-2 rounded-control bg-fill-quaternary px-3 py-2 text-[14px]">
                <span
                  className="min-w-0 flex-1 break-words line-clamp-2"
                  title={names.get(id)}
                  data-testid={`set-dependency-requires-name-${id}`}
                >
                  {names.get(id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Usuń wymaganie: ${names.get(id) ?? ''}`}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, requiresMappingIds: prev.requiresMappingIds.filter((entry) => entry !== id) }))
                  }
                  data-testid={`set-dependency-requires-remove-${id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {!showsWarmupRequirement && requires.length === 0 && (
              <li className="text-[13px] text-label-secondary">Nic. Pacjent może zacząć od tego ćwiczenia.</li>
            )}
          </ul>
          <Button
            variant="plain"
            size="sm"
            onClick={() => setIsPickerOpen(true)}
            data-testid="set-dependency-add-requirement-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj wymaganie
          </Button>
        </section>

        {waitsForSomething && (
          <section className="space-y-2" aria-labelledby="set-dependency-mode-heading">
            <h3 id="set-dependency-mode-heading" className="text-[13px] font-semibold text-foreground">
              Gdy pacjent tego nie zrobi
            </h3>
            <SegmentedControl
              value={draft.dependencyMode}
              options={MODE_OPTIONS}
              onChange={(mode) => setDraft((prev) => ({ ...prev, dependencyMode: mode }))}
              label="Gdy pacjent tego nie zrobi"
              testId="set-dependency-mode"
            />
            <p className="text-[13px] text-label-secondary">{MODE_HINT[draft.dependencyMode]}</p>
          </section>
        )}

        <p className="flex items-center gap-1.5 text-[13px] text-label-secondary" data-testid="set-dependency-validity-note">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Rozgrzewka ważna 60 min od zakończenia
        </p>
      </div>

      <DialogFooter className="flex items-center justify-between sm:justify-between">
        <Button variant="outline" onClick={onClose} data-testid="set-dependency-cancel-btn">
          Anuluj
        </Button>
        <Button onClick={handleSave} disabled={saving} data-testid="set-dependency-save-btn">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz
        </Button>
      </DialogFooter>

      <RequirementPickerDialog
        open={isPickerOpen}
        options={options}
        selected={requires}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={(ids) => {
          setDraft((prev) => ({ ...prev, requiresMappingIds: ids }));
          setIsPickerOpen(false);
        }}
      />
    </>
  );
}

interface RequirementPickerDialogProps {
  readonly open: boolean;
  readonly options: readonly RequirementOption[];
  readonly selected: readonly string[];
  readonly onClose: () => void;
  readonly onConfirm: (ids: string[]) => void;
}

const BLOCK_HINT: Record<NonNullable<RequirementOption['blockedBy']>, string> = {
  later: 'jest później – przesuń wyżej',
  warmup: 'rozgrzewka – zawsze przed',
};

/** SPEC-061 P2: „Co musi być przed?” – pozycje tego zestawu; stojące później są wyszarzone. */
function RequirementPickerDialog({ open, options, selected, onClose, onConfirm }: RequirementPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md" data-testid="set-dependency-picker-dialog">
        {open && <RequirementPicker options={options} selected={selected} onClose={onClose} onConfirm={onConfirm} />}
      </DialogContent>
    </Dialog>
  );
}

function RequirementPicker({ options, selected, onClose, onConfirm }: Omit<RequirementPickerDialogProps, 'open'>) {
  const [checked, setChecked] = useState<string[]>(() => [...selected]);
  const limitReached = checked.length >= MAX_REQUIREMENTS_PER_POSITION;

  const toggle = (id: string, next: boolean) =>
    setChecked((prev) => (next ? [...prev, id] : prev.filter((entry) => entry !== id)));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Co musi być przed?</DialogTitle>
        <DialogDescription>Zaznacz ćwiczenia z tego zestawu, które pacjent robi wcześniej.</DialogDescription>
      </DialogHeader>

      <ul className="max-h-[50vh] min-w-0 space-y-1 overflow-y-auto overflow-x-hidden py-2" data-testid="set-dependency-picker-list">
        {options.length === 0 && <li className="text-[13px] text-label-secondary">Zestaw nie ma innych ćwiczeń.</li>}
        {options.map((option) => {
          const isChecked = checked.includes(option.id);
          const disabled = option.blockedBy !== null || (!isChecked && limitReached);
          const inputId = `set-dependency-picker-${option.id}`;
          return (
            <li key={option.id} className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-fill-quaternary">
              <Checkbox
                id={inputId}
                checked={isChecked && option.blockedBy === null}
                disabled={disabled}
                onCheckedChange={(next) => toggle(option.id, next === true)}
                data-testid={`set-dependency-picker-option-${option.id}`}
              />
              <Label
                htmlFor={inputId}
                className={disabled ? 'flex min-w-0 flex-1 flex-col text-label-tertiary' : 'flex min-w-0 flex-1 flex-col'}
              >
                <span
                  className="break-words line-clamp-2"
                  title={option.name}
                  data-testid={`set-dependency-picker-name-${option.id}`}
                >
                  {option.name}
                </span>
                {option.blockedBy && (
                  <span className="text-[12px] font-normal text-label-secondary">{BLOCK_HINT[option.blockedBy]}</span>
                )}
              </Label>
            </li>
          );
        })}
      </ul>
      {limitReached && (
        <p className="text-[13px] text-label-secondary">Najwyżej {MAX_REQUIREMENTS_PER_POSITION} wymagań.</p>
      )}

      <DialogFooter className="flex items-center justify-between sm:justify-between">
        <Button variant="outline" onClick={onClose} data-testid="set-dependency-picker-cancel-btn">
          Anuluj
        </Button>
        <Button onClick={() => onConfirm(checked)} data-testid="set-dependency-picker-confirm-btn">
          Gotowe
        </Button>
      </DialogFooter>
    </>
  );
}
