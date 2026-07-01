'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EnrichmentDosingProfile, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface DosingProfilesSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  setPath: (path: string, value: unknown) => void;
  updateDraft: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  persist: () => Promise<void>;
}

export function DosingProfilesSection({
  draft,
  disabled = false,
  setPath,
  updateDraft,
  persist,
}: Readonly<DosingProfilesSectionProps>) {
  const entries = Object.entries(draft.dosing_profiles ?? {});

  const addProfile = () => {
    updateDraft((current) => {
      const existing = current.dosing_profiles ?? {};
      let index = 1;
      let key = `profile_${index}`;
      while (existing[key]) {
        index += 1;
        key = `profile_${index}`;
      }
      return {
        ...current,
        dosing_profiles: {
          ...existing,
          [key]: {},
        },
      };
    });
  };

  const renameProfile = (oldKey: string, newKey: string) => {
    updateDraft((current) => {
      const profiles = { ...(current.dosing_profiles ?? {}) };
      const normalizedNewKey = newKey.trim();
      if (!normalizedNewKey || normalizedNewKey === oldKey) {
        return current;
      }
      const value = profiles[oldKey];
      delete profiles[oldKey];
      profiles[normalizedNewKey] = value;
      return {
        ...current,
        dosing_profiles: profiles,
      };
    });
  };

  const removeProfile = (key: string) => {
    updateDraft((current) => {
      const profiles = { ...(current.dosing_profiles ?? {}) };
      delete profiles[key];
      return {
        ...current,
        dosing_profiles: profiles,
      };
    });
  };

  const setField = (profileKey: string, field: keyof EnrichmentDosingProfile, value: string) => {
    const numericFields: Array<keyof EnrichmentDosingProfile> = [
      'sets',
      'reps',
      'duration_seconds',
      'rest_reps_seconds',
      'rest_sets_seconds',
    ];
    const parsedValue = numericFields.includes(field) ? (value === '' ? undefined : Number(value)) : value;
    setPath(`dosing_profiles.${profileKey}.${field}`, parsedValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Profile dawkowania</p>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addProfile}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Dodaj profil
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="rounded-md border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
          Brak profili dawkowania.
        </p>
      )}

      {entries.map(([profileKey, profile]) => (
        <div key={profileKey} className="space-y-2 rounded-md border border-border/50 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={profileKey}
              disabled={disabled}
              onChange={(event) => renameProfile(profileKey, event.target.value)}
              onBlur={() => void persist()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => {
                removeProfile(profileKey);
                void persist();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            <Input
              type="number"
              placeholder="Serie"
              className="min-w-0 w-full"
              value={profile.sets ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'sets', event.target.value)}
              onBlur={() => void persist()}
            />
            <Input
              type="number"
              placeholder="Powtórzenia"
              className="min-w-0 w-full"
              value={profile.reps ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'reps', event.target.value)}
              onBlur={() => void persist()}
            />
            <Input
              type="number"
              placeholder="Czas (s)"
              className="min-w-0 w-full"
              value={profile.duration_seconds ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'duration_seconds', event.target.value)}
              onBlur={() => void persist()}
            />
            <Input
              type="number"
              placeholder="Przerwa między powt. (s)"
              className="min-w-0 w-full"
              value={profile.rest_reps_seconds ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'rest_reps_seconds', event.target.value)}
              onBlur={() => void persist()}
            />
            <Input
              type="number"
              placeholder="Przerwa między seriami (s)"
              className="min-w-0 w-full"
              value={profile.rest_sets_seconds ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'rest_sets_seconds', event.target.value)}
              onBlur={() => void persist()}
            />
            <Input
              placeholder="Częstotliwość"
              className="min-w-0 w-full"
              value={profile.frequency ?? ''}
              disabled={disabled}
              onChange={(event) => setField(profileKey, 'frequency', event.target.value)}
              onBlur={() => void persist()}
            />
          </div>

          <Input
            placeholder="Notatki dawkowania"
            value={profile.notes ?? ''}
            disabled={disabled}
            onChange={(event) => setField(profileKey, 'notes', event.target.value)}
            onBlur={() => void persist()}
          />
        </div>
      ))}
    </div>
  );
}
