import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Zapadka: każde miejsce, które liczy czas albo opisuje dawkę „naprzemiennie” z pierwotnych funkcji, musi podać
 * wersję rekordu (`alternatingPerSide`, z `isV33ExerciseRecord`). Nowe wywołanie bez niej = czerwono, zamiast
 * po cichu liczyć łącznie tam, gdzie pacjent ma na stronę (KONTRAKT-v3.3 §6.7, wariant B).
 *
 * Wyjątki są jawne i mają powód; wyjątek, który już podaje wersję, też jest błędem (lista nie może się zestarzeć).
 */
const SRC = join(__dirname, '..');

const CALL_TARGETS = [
  { name: 'calculateExerciseTotalSeconds', kind: 'call' },
  { name: 'calculateEstimatedTime', kind: 'call' },
  { name: 'translateExerciseSidePolish', kind: 'call' },
  { name: 'ExerciseParametersFields', kind: 'jsx' },
] as const;

/** Plik -> powód, dla którego wywołanie bez wersji jest poprawne. */
const EXEMPT: Record<string, string> = {
  'features/exercises/CreateExerciseWizard.tsx':
    'Nowe ćwiczenie, jeszcze bez rekordu: portal nie zapisuje schemaVersion, więc liczy łącznie jak rekord bez wersji.',
  'features/verification/utils/parameterRules.ts':
    'Weryfikacja treści (stos #223): reguła wersji i dawka na stronę żyją tam (resolveSideDose); ten PR jej nie dotyka.',
};

/**
 * Miejsca, gdzie wersja rekordu wchodzi do dawki, a które nie są wywołaniem z listy wyżej (przypisanie do obiektu,
 * źródło flagi, etykieta). Test tekstowy: kasuje usunięcie wiringu, nie sprawdza jego działania (to robią testy
 * zachowania obok).
 */
const WIRING: Record<string, string[]> = {
  'app/(dashboard)/exercises/page.tsx': ['alternatingPerSide: isV33ExerciseRecord(exercise)'],
  'features/exercises/useExerciseEditorForm.ts': ['isV33ExerciseRecord(source)'],
  'features/exercises/ExerciseEditor.tsx': ['alternatingPerSide={form.alternatingPerSide}'],
  'features/patients/EditExerciseOverrideDialog.tsx': [
    'const alternatingPerSide = isV33ExerciseRecord(exercise);',
    "'naprzemiennie, na każdą stronę' : 'naprzemiennie, łącznie'",
    'translateSide(exerciseSide, alternatingPerSide)',
  ],
  'features/patients/ExercisePreviewDrawer.tsx': ['enrichmentData: exercise?.enrichmentData'],
  'components/shared/exercise/ExerciseExecutionCard.tsx': ['alternatingPerSide={exercise.alternatingPerSide}'],
  'components/pdf/polishUtils.ts': ["'Naprzemiennie, na każdą stronę' : 'Naprzemiennie, łącznie'"],
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' || entry === 'node_modules' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts') ? [path] : [];
  });
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Tekst od otwarcia do domknięcia nawiasu (albo do `/>` znacznika JSX). */
function balanced(text: string, from: number, open: string, close: string): string {
  let depth = 0;
  for (let index = from; index < text.length; index += 1) {
    if (text[index] === open) depth += 1;
    if (text[index] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(from, index + 1);
    }
  }
  return text.slice(from);
}

interface Site {
  file: string;
  target: string;
  line: number;
  passesVersion: boolean;
}

function findSites(): Site[] {
  const sites: Site[] = [];
  for (const path of sourceFiles(SRC)) {
    const file = relative(SRC, path);
    const text = stripComments(readFileSync(path, 'utf8'));
    for (const { name, kind } of CALL_TARGETS) {
      const pattern = kind === 'jsx' ? new RegExp(`<${name}\\b`, 'g') : new RegExp(`(?<![\\w.])${name}\\s*\\(`, 'g');
      for (const match of text.matchAll(pattern)) {
        const before = text.slice(Math.max(0, match.index - 20), match.index);
        if (kind === 'call' && /(function|import|export)\s*(\{[^}]*)?$/.test(before)) continue;
        let body: string;
        if (kind === 'jsx') {
          const end = text.indexOf('/>', match.index);
          body = text.slice(match.index, end === -1 ? undefined : end);
        } else {
          body = balanced(text, text.indexOf('(', match.index), '(', ')');
        }
        sites.push({
          file,
          target: name,
          line: text.slice(0, match.index).split('\n').length,
          passesVersion: /alternatingPerSide/.test(body),
        });
      }
    }
  }
  return sites;
}

describe('zapadka wersji rekordu: każde wywołanie dawki / czasu „naprzemiennie” podaje wersję', () => {
  const sites = findSites();

  it('znajduje wywołania (zapadka nie jest pusta)', () => {
    expect(sites.length).toBeGreaterThan(10);
    for (const { name } of CALL_TARGETS) expect(sites.some((site) => site.target === name)).toBe(true);
  });

  it('żadne wywołanie spoza listy wyjątków nie pomija alternatingPerSide', () => {
    const missing = sites
      .filter((site) => !site.passesVersion && !(site.file in EXEMPT))
      .map((site) => `${site.file}:${site.line} ${site.target}`);
    expect(missing).toEqual([]);
  });

  it('wyjątki wciąż istnieją i żaden nie podaje już wersji (inaczej wyjątek jest zbędny)', () => {
    for (const file of Object.keys(EXEMPT)) {
      const own = sites.filter((site) => site.file === file);
      expect(own.length, `${file} nie ma już wywołań z listy`).toBeGreaterThan(0);
      expect(
        own.filter((site) => site.passesVersion).map((site) => `${site.file}:${site.line}`),
        'wyjątek podaje już wersję: usuń go z listy'
      ).toEqual([]);
    }
  });

  it.each(Object.entries(WIRING))('%s niesie wersję rekordu do dawki', (file, fragments) => {
    const text = readFileSync(join(SRC, file), 'utf8');
    for (const fragment of fragments) expect(text, `${file}: brak ${fragment}`).toContain(fragment);
  });
});
