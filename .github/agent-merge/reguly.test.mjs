import assert from 'node:assert/strict';
import { test } from 'node:test';

import { drzwiZOpisu, ocen, ocenPliki, otwarteWatki, pasuje, werdykt, wzorce, wzorzecNaRegex } from './reguly.mjs';

const SHA = 'a'.repeat(40);
const cfg = { gate: 'gate', review: 'review', maxLinii: 300, maxPlikow: 15 };
const dozwolone = wzorce('/components/ui/\n/docs/\n*.md\n/app/(tabs)/therapist/', { poddrzewo: false });
const zakazane = wzorce('/.github/\nAGENTS.md\n/app/(tabs)/therapist/_layout.tsx\n/backend/');

const PR = {
  number: 1,
  draft: false,
  labels: [],
  title: 'fix(ui): x',
  additions: 10,
  deletions: 2,
  changed_files: 1,
  mergeable: true,
  mergeable_state: 'clean',
  body: '## Drzwi\n\n- [x] Dwukierunkowe: tanio cofnąć\n- [ ] Jednokierunkowe: migracja',
  head: { sha: SHA, repo: { full_name: 'o/r' } },
  base: { repo: { full_name: 'o/r' } },
};
const ZIELONE = [
  { id: 1, name: 'gate', status: 'completed', conclusion: 'success' },
  { id: 2, name: 'review', status: 'completed', conclusion: 'success' },
];
const PASS = [
  {
    user: { login: 'claude[bot]', type: 'Bot' },
    created_at: 't',
    updated_at: 't',
    body: `PASS ${SHA.slice(0, 7)}\n\nok`,
  },
];
const PLIK = [
  {
    filename: 'components/ui/Button.tsx',
    status: 'modified',
    additions: 10,
    deletions: 2,
    patch: '+a\n-b',
  },
];
const wejscie = (zmiany = {}) => ({
  pr: PR,
  pliki: PLIK,
  checkRuns: ZIELONE,
  komentarze: PASS,
  reviews: [],
  watki: [],
  mainCzerwony: null,
  cfg,
  zakazane,
  dozwolone,
  ...zmiany,
});

test('zielony PR z dozwolonymi plikami przechodzi', () => {
  assert.deepEqual(ocen(wejscie()), { stan: 'tak', powody: [] });
});

test('checki w toku: czeka bez komentarza', () => {
  assert.equal(
    ocen(
      wejscie({
        checkRuns: [ZIELONE[0], { id: 3, name: 'review', status: 'in_progress' }],
      })
    ).stan,
    'czeka'
  );
  assert.equal(ocen(wejscie({ checkRuns: [ZIELONE[1]] })).stan, 'czeka');
});

test('rerun liczy się po najnowszym id', () => {
  const runs = [...ZIELONE, { id: 9, name: 'gate', status: 'completed', conclusion: 'failure' }];
  assert.equal(ocen(wejscie({ checkRuns: runs })).stan, 'nie');
});

test('werdykt: tylko nieedytowany claude[bot] dla heada, FAIL wygrywa', () => {
  assert.equal(werdykt(PASS, SHA), 'PASS');
  assert.equal(werdykt([{ ...PASS[0], updated_at: 'u' }], SHA), 'brak');
  assert.equal(werdykt([{ ...PASS[0], user: { login: 'claude', type: 'User' } }], SHA), 'brak');
  assert.equal(werdykt([{ ...PASS[0], body: 'PASS bbbbbbb' }], SHA), 'brak');
  assert.equal(werdykt([...PASS, { ...PASS[0], body: `FAIL ${SHA.slice(0, 7)}` }], SHA), 'FAIL');
});

test('drzwi: wymagane wyłącznie dwukierunkowe', () => {
  assert.equal(drzwiZOpisu(PR.body), true);
  assert.equal(drzwiZOpisu('- [x] Dwukierunkowe\n- [x] Jednokierunkowe'), false);
  assert.equal(drzwiZOpisu('- [ ] Dwukierunkowe'), false);
  assert.equal(drzwiZOpisu(null), false);
});

test('ścieżki: zakazane wygrywają z dozwolonymi, nowy katalog to brak zgody', () => {
  const p = (filename, extra = {}) => ({
    filename,
    status: 'modified',
    additions: 1,
    deletions: 0,
    patch: '+x',
    ...extra,
  });
  assert.deepEqual(ocenPliki([p('docs/a.md')], { dozwolone, zakazane }), []);
  assert.match(ocenPliki([p('AGENTS.md')], { dozwolone, zakazane })[0], /poza zasięgiem/);
  assert.match(ocenPliki([p('components/ui/AGENTS.md')], { dozwolone, zakazane })[0], /poza zasięgiem/);
  assert.match(
    ocenPliki([p('app/(tabs)/therapist/_layout.tsx')], {
      dozwolone,
      zakazane,
    })[0],
    /poza zasięgiem/
  );
  assert.match(ocenPliki([p('backend/README.md')], { dozwolone, zakazane })[0], /poza zasięgiem/);
  assert.match(ocenPliki([p('utils/nowy.ts')], { dozwolone, zakazane })[0], /spoza listy/);
  assert.match(
    ocenPliki([p('docs/a.md', { previous_filename: '.github/workflows/ci.yml' })], { dozwolone, zakazane })[0],
    /poza zasięgiem/
  );
});

test('testy: usunięcie asercji, pliku testu albo skip blokuje', () => {
  const d = wzorce('**');
  const z = [];
  assert.match(
    ocenPliki(
      [
        {
          filename: 'utils/__tests__/a.test.ts',
          status: 'modified',
          additions: 0,
          deletions: 1,
          patch: '-  expect(x).toBe(1)',
        },
      ],
      { dozwolone: d, zakazane: z }
    )[0],
    /ubyło asercji/
  );
  assert.deepEqual(
    ocenPliki(
      [
        {
          filename: 'utils/__tests__/a.test.ts',
          status: 'modified',
          additions: 1,
          deletions: 1,
          patch: '-  expect(x).toBe(1)\n+  expect(x).toBe(2)',
        },
      ],
      { dozwolone: d, zakazane: z }
    ),
    []
  );
  assert.match(
    ocenPliki(
      [
        {
          filename: 'utils/__tests__/a.test.ts',
          status: 'removed',
          additions: 0,
          deletions: 5,
          patch: '',
        },
      ],
      {
        dozwolone: d,
        zakazane: z,
      }
    )[0],
    /usunięty plik testu/
  );
  assert.match(
    ocenPliki(
      [
        {
          filename: 'src/a.test.tsx',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: "+it.skip('x', () => {})",
        },
      ],
      { dozwolone: d, zakazane: z }
    )[0],
    /wyłączony/
  );
  assert.match(
    ocenPliki(
      [
        {
          filename: 'tests/a.spec.ts',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: "+test.fixme('x')",
        },
      ],
      { dozwolone: d, zakazane: z }
    )[0],
    /wyłączony/
  );
  assert.match(
    ocenPliki(
      [
        {
          filename: 'backend/X.Tests/ATests.cs',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '+[Fact(Skip = "x")]',
        },
      ],
      { dozwolone: d, zakazane: z }
    )[0],
    /wyłączony/
  );
  assert.deepEqual(
    ocenPliki(
      [
        {
          filename: 'src/a.test.tsx',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '+  expect(y).toBe(2)',
        },
      ],
      { dozwolone: d, zakazane: z }
    ),
    []
  );
  assert.match(
    ocenPliki(
      [
        {
          filename: 'src/big.ts',
          status: 'modified',
          additions: 9000,
          deletions: 0,
        },
      ],
      {
        dozwolone: d,
        zakazane: z,
      }
    )[0],
    /brak diffu/
  );
});

test('pozostałe hamulce', () => {
  const nie = (z) => ocen(wejscie(z)).powody.join(' ');
  assert.match(nie({ pr: { ...PR, labels: [{ name: 'hold' }] } }), /hold/);
  assert.match(nie({ pr: { ...PR, additions: 400 } }), /za duży/);
  assert.match(nie({ pr: { ...PR, changed_files: 20 } }), /za dużo plików/);
  assert.match(nie({ pr: { ...PR, mergeable: false, mergeable_state: 'dirty' } }), /mergeable/);
  assert.match(nie({ pr: { ...PR, head: { sha: SHA, repo: { full_name: 'fork/r' } } } }), /forka/);
  assert.match(nie({ reviews: [{ user: { login: 'adam' }, state: 'CHANGES_REQUESTED' }] }), /prośba o zmiany/);
  assert.doesNotMatch(
    nie({
      reviews: [
        { user: { login: 'adam' }, state: 'CHANGES_REQUESTED' },
        { user: { login: 'adam' }, state: 'APPROVED' },
      ],
    }),
    /prośba/
  );
  assert.match(nie({ watki: [{ isResolved: false, isOutdated: false, autor: 'adam' }] }), /wątki/);
  assert.match(nie({ mainCzerwony: 'E2E Dev Full: failure' }), /czerwony/);
  assert.match(nie({ komentarze: [] }), /brak/);
  assert.equal(ocen(wejscie({ pr: { ...PR, draft: true } })).stan, 'czeka');
});

test('wzorce: składnia spoza modelu rzuca błąd, komentarz i pusta linia znikają', () => {
  assert.throws(() => wzorzecNaRegex('!docs/'));
  assert.throws(() => wzorzecNaRegex('[ab].ts'));
  assert.equal(wzorzecNaRegex('# x'), null);
  assert.equal(wzorzecNaRegex('  '), null);
  assert.ok(wzorzecNaRegex('/src/graphql/mutations/**').test('src/graphql/mutations/a/b.ts'));
  assert.ok(wzorzecNaRegex('*.graphql').test('src/x/y.graphql'));
  assert.ok(!wzorzecNaRegex('/src/proxy.ts').test('src/proxy.tsx'));
  assert.ok(wzorzecNaRegex('/.claude/settings*.json').test('.claude/settings.local.json'));
});

test('wątki: człowiek blokuje zawsze, recenzent CI tylko bez PASS, przestarzałe i rozwiązane nie', () => {
  const czlowiek = { isResolved: false, isOutdated: false, autor: 'adam' };
  const bot = { isResolved: false, isOutdated: false, autor: 'claude' };
  assert.equal(otwarteWatki([czlowiek, bot], true), 1);
  assert.equal(otwarteWatki([czlowiek, bot], false), 2);
  assert.equal(otwarteWatki([{ ...czlowiek, isOutdated: true }], false), 0);
  assert.equal(otwarteWatki([{ ...czlowiek, isResolved: true }], false), 0);
  assert.equal(ocen(wejscie({ watki: [bot] })).stan, 'tak');
});

test('testy: przeniesienie testu poza testy i warianty skip blokują', () => {
  const d = wzorce('**');
  const z = [];
  const przeniesiony = {
    filename: 'docs/archiwum/x.test.ts.md',
    previous_filename: 'utils/__tests__/x.test.ts',
    status: 'renamed',
    additions: 0,
    deletions: 0,
  };
  assert.match(ocenPliki([przeniesiony], { dozwolone: d, zakazane: z }).join(' '), /przeniesiony poza testy/);
  assert.deepEqual(
    ocenPliki([{ ...przeniesiony, filename: 'utils/__tests__/y.test.ts' }], {
      dozwolone: d,
      zakazane: z,
    }),
    []
  );
  for (const linia of [
    "+it.skipIf(ci)('x', () => {})",
    "+describe.runIf(false)('x', () => {})",
    "+test.concurrent.skip('x')",
  ]) {
    assert.match(
      ocenPliki(
        [
          {
            filename: 'src/a.test.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            patch: linia,
          },
        ],
        { dozwolone: d, zakazane: z }
      )[0],
      /wyłączony/,
      linia
    );
  }
});

test('dozwolone: wzorzec pliku nie otwiera poddrzewa, zakazany tak', () => {
  const allow = wzorce('*.md\n/docs/', { poddrzewo: false });
  assert.ok(pasuje('docs/x/y.ts', allow));
  assert.ok(pasuje('src/README.md', allow));
  assert.ok(!pasuje('src/app/foo.md/page.tsx', allow));
  const deny = wzorce('*auth*\nactions.*\nroute.*');
  assert.ok(pasuje('src/app/auth/page.tsx', deny));
  assert.ok(pasuje('src/app/(ops)/x/actions.tsx', deny));
  assert.ok(pasuje('src/app/api/x/route.js', deny));
});

test('nowa server action blokuje niezależnie od nazwy pliku', () => {
  const d = wzorce('**');
  const p = (patch) =>
    ocenPliki(
      [
        {
          filename: 'src/components/Form.tsx',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch,
        },
      ],
      { dozwolone: d, zakazane: [] }
    );
  assert.match(p('+"use server";')[0], /server action/);
  assert.match(p("+  'use server'")[0], /server action/);
  assert.deepEqual(p('-"use server";'), []);
});
