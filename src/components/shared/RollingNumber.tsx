'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export type RollDirection = 'up' | 'down';

interface RollingNumberProps {
  value: number;
  /** Minimalna liczba cyfr (np. 2 dla sekund: „05”). */
  minDigits?: number;
  /**
   * Kierunek animacji. Domyślnie z porównania wartości; podaj, gdy kilka liczników
   * pokazuje jedną wielkość (minuty i sekundy) i mają kręcić się w tę samą stronę.
   */
  direction?: RollDirection;
  className?: string;
}

/**
 * Liczba, której zmienione cyfry przewijają się jak w liczniku: w górę, gdy wartość rośnie,
 * w dół, gdy maleje. Pierwszy render bez animacji. Tekst dla czytnika ekranu podaje rodzic.
 */
export function RollingNumber({ value, minDigits = 1, direction, className }: RollingNumberProps) {
  const text = String(Math.max(0, Math.round(value))).padStart(minDigits, '0');
  const [roll, setRoll] = useState({ value, text, previous: text, version: 0, direction: 'up' as RollDirection });

  // Wzorzec React: dopasowanie stanu do nowej wartości w trakcie renderu, bez efektu.
  if (roll.text !== text) {
    setRoll({
      value,
      text,
      previous: roll.text,
      version: roll.version + 1,
      direction: direction ?? (value >= roll.value ? 'up' : 'down'),
    });
  }

  const width = Math.max(text.length, roll.previous.length);
  const current = text.padStart(width, ' ');
  const previous = roll.previous.padStart(width, ' ');

  return (
    <span className={cn('inline-flex tabular-nums', className)} aria-hidden="true">
      {[...current].map((char, index) => {
        const before = previous[index];
        const changed = roll.version > 0 && before !== char;
        const delay = { animationDelay: `${(width - 1 - index) * 45}ms` };
        if (!changed) {
          return char === ' ' ? null : (
            <span key={`${index}-static`} className="inline-block">
              {char}
            </span>
          );
        }
        return (
          // clip-path zamiast overflow-hidden: przycina przewijaną cyfrę, a nie przesuwa linii bazowej.
          <span key={`${index}-${roll.version}`} className="relative inline-block [clip-path:inset(0)]">
            {char === ' ' ? null : (
              <span className={cn('inline-block', `animate-roll-in-${roll.direction}`)} style={delay}>
                {char}
              </span>
            )}
            {before !== ' ' && (
              <span
                className={cn('absolute inset-x-0 top-0 inline-block', `animate-roll-out-${roll.direction}`)}
                style={delay}
              >
                {before}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
