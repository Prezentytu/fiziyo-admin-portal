'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import type { V33EditCollision } from '@/components/shared/exercise/writeExerciseContent';
import { Button } from '@/components/ui/button';

import { linkedPathsOf, type SaveCollisionResolution } from './utils/saveCollisions';

interface ExerciseSaveConflictNoticeProps {
  /** Fields changed both on this screen and in the database; each needs a choice before loading. */
  collisions: readonly V33EditCollision[];
  /** Moves the draft onto the current version; `resolution` says which version stays in each collided field. */
  onLoadCurrent: (resolution: SaveCollisionResolution) => void;
}

/** Field names as the therapist sees them; a path without a name is shown as is. */
export const SAVE_COLLISION_FIELD_LABELS: Readonly<Record<string, string>> = {
  'patient.summary': 'Podsumowanie',
  'patient.why': 'Po co to ćwiczenie',
  'patient.when_to_do': 'Kiedy wykonywać',
  'patient.should_feel': 'Co pacjent powinien czuć',
  'patient.should_not_feel': 'Czego pacjent nie powinien czuć',
  'patient.easier': 'Łatwiejsza wersja',
  'patient.harder': 'Trudniejsza wersja',
  'breathing.text': 'Oddech',
  'safety.stop_if': 'Kiedy przerwać',
  'therapist.note': 'Uwaga dla fizjoterapeuty',
  'safety.requires_supervision': 'Wymaga nadzoru',
  'patient.steps': 'Kroki',
  'patient.step_images': 'Zdjęcia przypięte do kroków',
  'patient.cues': 'Wskazówki',
  'patient.cue_phases': 'Fazy wskazówek',
  'patient.mistakes': 'Częste błędy',
  'safety.contraindications': 'Przeciwwskazania',
  'safety.precautions': 'Ostrożność w grupach szczególnych',
  'therapist.checkpoints': 'Punkty kontrolne',
  equipment_items: 'Sprzęt',
  'ai.keywords': 'Słowa kluczowe',
};

function describeRow(row: unknown): string {
  if (row !== null && typeof row === 'object') {
    return Object.values(row as Record<string, unknown>)
      .filter((part) => typeof part === 'string' || typeof part === 'number' || typeof part === 'boolean')
      .join(' · ');
  }
  return String(row);
}

/** One version of a collided field as lines of text; an emptied field says so. */
export function describeCollisionValue(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return ['(puste)'];
  if (typeof value === 'boolean') return [value ? 'tak' : 'nie'];
  if (Array.isArray(value)) return value.length > 0 ? value.map(describeRow) : ['(puste)'];
  return [describeRow(value)];
}

function VersionText({ title, value }: Readonly<{ title: string; value: unknown }>) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {describeCollisionValue(value).map((line, index) => (
        <p key={`${index}-${line}`} className="break-words text-sm text-foreground">
          {line}
        </p>
      ))}
    </div>
  );
}

interface CollisionGroup {
  /** First field of the group; names the group in test ids and in the choice state. */
  key: string;
  fields: V33EditCollision[];
}

/** Fields decided by one choice: a single field, or both lists of a linked pair (steps with their photos). */
function groupCollisions(collisions: readonly V33EditCollision[]): CollisionGroup[] {
  const groups: CollisionGroup[] = [];
  for (const collision of collisions) {
    const linked = linkedPathsOf(collision.path);
    const group = groups.find(({ fields }) => linked.includes(fields[0].path));
    if (group) group.fields.push(collision);
    else groups.push({ key: collision.path, fields: [collision] });
  }
  return groups;
}

const fieldLabel = (path: string) => SAVE_COLLISION_FIELD_LABELS[path] ?? path;

/** Shown when someone else saved the exercise while it was being edited; the save did not happen. */
export function ExerciseSaveConflictNotice({ collisions, onLoadCurrent }: Readonly<ExerciseSaveConflictNoticeProps>) {
  const [choices, setChoices] = useState<Record<string, 'mine' | 'theirs'>>({});
  const groups = groupCollisions(collisions);
  const resolution = Object.fromEntries(
    groups
      .filter(({ key }) => choices[key])
      .flatMap(({ key, fields }) => fields.map(({ path }) => [path, choices[key]]))
  );
  const isResolved = groups.every(({ key }) => choices[key]);

  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-status-warning/40 bg-status-warning-muted p-4"
      data-testid="exercise-save-conflict-notice"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Ktoś zmienił to ćwiczenie w trakcie Twojej edycji</p>
          {collisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zmiany z tego ekranu nie zostały zapisane. Tamta osoba zmieniła inne pola niż Ty: po wczytaniu aktualnej
              wersji jej zmiany zostaną, a Twoja treść zostanie na ekranie. Potem zapisz ponownie.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Zmiany z tego ekranu nie zostały zapisane. W polach poniżej tamta osoba zapisała inną treść niż Twoja.
              Wybierz przy każdym, która wersja zostaje: druga przepadnie. Zmiany w pozostałych polach zostają po obu
              stronach. Potem zapisz ponownie.
            </p>
          )}
        </div>
        {groups.map(({ key, fields }) => (
          <div
            key={key}
            className="space-y-2 rounded-xl border border-border bg-background p-3"
            data-testid={`exercise-save-conflict-collision-${key}`}
          >
            {fields.length > 1 ? (
              <p className="text-sm text-muted-foreground">
                Te pola zapisują się razem, więc wybierasz jedną wersję dla obu.
              </p>
            ) : null}
            {fields.map(({ path, mine, theirs }) => (
              <div key={path} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{fieldLabel(path)}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <VersionText title="Twoja wersja (niezapisana)" value={mine} />
                  <VersionText title="Wersja zapisana przez tamtą osobę" value={theirs} />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={choices[key] === 'mine' ? 'default' : 'outline'}
                aria-pressed={choices[key] === 'mine'}
                onClick={() => setChoices((previous) => ({ ...previous, [key]: 'mine' }))}
                data-testid={`exercise-save-conflict-keep-mine-${key}-btn`}
              >
                Zostaw moją
              </Button>
              <Button
                type="button"
                size="sm"
                variant={choices[key] === 'theirs' ? 'default' : 'outline'}
                aria-pressed={choices[key] === 'theirs'}
                onClick={() => setChoices((previous) => ({ ...previous, [key]: 'theirs' }))}
                data-testid={`exercise-save-conflict-keep-theirs-${key}-btn`}
              >
                Zostaw zapisaną, odrzuć moją
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isResolved}
        onClick={() => onLoadCurrent(resolution)}
        data-testid="exercise-save-conflict-load-btn"
      >
        Wczytaj aktualną wersję
      </Button>
    </div>
  );
}
