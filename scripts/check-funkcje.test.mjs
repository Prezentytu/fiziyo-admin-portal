import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkFunkcje } from './check-funkcje.mjs';

const valid = `# Player

## Rola
Pacjent ćwiczy między wizytami.

## Jak dotrzeć
Trasa \`src/player.tsx\`, panel \`fizjo-app:app/(tabs)/patient/index.tsx\`.

## Jak sprawdzić
\`src/utils/__tests__/a.test.ts:12\`, polecenie \`npm\`.

## Uważaj na
Zmiana przypisania przebudowuje sesję: [przypisanie](przypisanie.md).
`;

function fixture(context, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'funkcje-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries({
    'src/player.tsx': 'x',
    'src/utils/__tests__/a.test.ts': 'x',
    ...files,
  })) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const indeks = '- [player](player.md)\n- [przypisanie](przypisanie.md)\n';
const przypisanie = valid
  .replace('# Player', '# Przypisanie')
  .replace('[przypisanie](przypisanie.md)', '[player](player.md)');

test('poprawna mapa nie ma błędów; ścieżki innego repo i numer linii nie przeszkadzają', (context) => {
  const root = fixture(context, {
    'docs/funkcje/README.md': indeks,
    'docs/funkcje/player.md': valid,
    'docs/funkcje/przypisanie.md': przypisanie,
  });
  assert.deepEqual(checkFunkcje(root), []);
});

test('pada na brakującej i pustej sekcji, martwej ścieżce, martwym linku i braku w indeksie', (context) => {
  const zly = valid
    .replace('## Rola\nPacjent ćwiczy między wizytami.\n', '## Rola\n\n')
    .replace('## Uważaj na', '## Uwagi')
    .replace('src/player.tsx', 'src/brak.tsx');
  const root = fixture(context, {
    'docs/funkcje/README.md': '- [player](player.md)\n',
    'docs/funkcje/player.md': zly,
    'docs/funkcje/przypisanie.md': przypisanie,
  });
  const errors = checkFunkcje(root).join('\n');
  assert.match(errors, /player\.md: pusta sekcja „## Rola”/);
  assert.match(errors, /player\.md: brak sekcji „## Uważaj na”/);
  assert.match(errors, /player\.md: ścieżka src\/brak\.tsx nie istnieje/);
  assert.match(errors, /przypisanie\.md: brak wpisu w docs\/funkcje\/README\.md/);
  fs.rmSync(path.join(root, 'docs/funkcje/przypisanie.md'));
  fs.writeFileSync(path.join(root, 'docs/funkcje/README.md'), indeks);
  assert.match(checkFunkcje(root).join('\n'), /player\.md: link przypisanie\.md nie istnieje/);
});

test('pada bez indeksu i bez plików funkcji', (context) => {
  assert.match(checkFunkcje(fixture(context, {})).join('\n'), /brak indeksu/);
  assert.match(checkFunkcje(fixture(context, { 'docs/funkcje/README.md': 'x' })).join('\n'), /brak plików funkcji/);
});
