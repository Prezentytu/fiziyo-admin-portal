'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface VerificationExerciseNameProps {
  name: string;
  onChange: (name: string) => void;
}

/**
 * Tytuł ekranu weryfikacji: klik zamienia go w pole nazwy. Zapis idzie autosave'em formularza (to samo `core.name`
 * co pole na etapie „Instrukcja”); Enter i wyjście z pola kończą edycję, Escape przywraca nazwę sprzed edycji.
 */
export function VerificationExerciseName({ name, onChange }: VerificationExerciseNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const nameBeforeEdit = useRef(name);

  if (isEditing) {
    return (
      <Input
        data-testid="verification-name-input"
        autoFocus
        aria-label="Nazwa ćwiczenia"
        value={name}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            setIsEditing(false);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onChange(nameBeforeEdit.current);
            setIsEditing(false);
          }
        }}
        className="h-9 min-w-0 flex-1 basis-80 text-[20px] font-semibold leading-[25px] md:text-[20px]"
      />
    );
  }

  return (
    <h1 className="min-w-0 truncate text-[20px] font-semibold leading-[25px] text-foreground">
      <button
        type="button"
        title="Zmień nazwę"
        onClick={() => {
          nameBeforeEdit.current = name;
          setIsEditing(true);
        }}
        className="max-w-full truncate rounded-md text-left decoration-label-tertiary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="verification-name-btn"
      >
        {name.trim() || 'Ćwiczenie bez nazwy'}
      </button>
    </h1>
  );
}
