import { describe, expect, it } from 'vitest';
import {
  preferencesToRestore,
  QUEUE_PREFERENCES_KEY,
  readQueuePreferences,
  writeQueuePreferences,
} from '../queuePreferences';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

const DEFAULT = { sort: 'NEWEST', assignee: 'all' } as const;

describe('queuePreferences', () => {
  it('zapisuje i odczytuje kolejność oraz przypisanie', () => {
    const storage = memoryStorage();
    writeQueuePreferences({ sort: 'OLDEST', assignee: 'mine' }, storage);
    expect(readQueuePreferences(storage)).toEqual({ sort: 'OLDEST', assignee: 'mine' });
  });

  it('nieznane albo uszkodzone wartości dają domyślne zamiast błędu', () => {
    expect(readQueuePreferences(memoryStorage())).toBeNull();
    expect(readQueuePreferences(memoryStorage({ [QUEUE_PREFERENCES_KEY]: '{nie json' }))).toBeNull();
    expect(
      readQueuePreferences(memoryStorage({ [QUEUE_PREFERENCES_KEY]: JSON.stringify({ sort: 'X', assignee: 7 }) }))
    ).toEqual(DEFAULT);
  });

  it('niedostępna pamięć przeglądarki nie psuje listy', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readQueuePreferences(broken)).toBeNull();
    expect(() => writeQueuePreferences({ sort: 'OLDEST', assignee: 'mine' }, broken)).not.toThrow();
  });

  it('przywraca zapamiętany koniec kolejki przy wejściu bez parametrów', () => {
    const stored = { sort: 'OLDEST', assignee: 'mine' } as const;
    expect(preferencesToRestore(new URLSearchParams(''), DEFAULT, stored)).toEqual(stored);
  });

  it('link z jawnym sort albo assignee wygrywa z zapamiętanym ustawieniem', () => {
    const stored = { sort: 'OLDEST', assignee: 'mine' } as const;
    expect(preferencesToRestore(new URLSearchParams('sort=oldest'), DEFAULT, stored)).toBeNull();
    expect(preferencesToRestore(new URLSearchParams('assignee=unassigned'), DEFAULT, stored)).toBeNull();
  });

  it('nic nie zmienia, gdy brak zapisu albo lista już pokazuje to samo', () => {
    expect(preferencesToRestore(new URLSearchParams(''), DEFAULT, null)).toBeNull();
    expect(preferencesToRestore(new URLSearchParams(''), DEFAULT, DEFAULT)).toBeNull();
  });
});
