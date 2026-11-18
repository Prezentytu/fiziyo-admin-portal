import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectViolationsFromContent,
  compareWithAllowlist,
  countViolationsByKey,
} from './check-testid-coverage.mjs';

test('does not flag a Button whose data-testid sits after an arrow onClick', () => {
  const source = `'use client';
import { Button } from '@/components/ui/button';

export function Card({ onAdd }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onAdd()}
      data-testid="ai-chat-exercise-add-to-set-btn"
    >
      Add
    </Button>
  );
}
`;

  assert.deepEqual(collectViolationsFromContent(source, 'src/components/chat/ExerciseCard.tsx'), []);
});

test('still flags a Button with no data-testid', () => {
  const source = `<Button onClick={() => go()}>Go</Button>\n`;
  const violations = collectViolationsFromContent(source, 'src/demo.tsx');

  assert.equal(violations.length, 1);
  assert.equal(violations[0].id, 'src/demo.tsx:1:Button');
});

test('does not treat comparison inside braces as the tag closer', () => {
  const source = `<Button
  disabled={count > 0}
  data-testid="demo-btn"
>
  Go
</Button>
`;

  assert.deepEqual(collectViolationsFromContent(source, 'src/demo.tsx'), []);
});

const LEGACY_FILE = 'src/components/settings/SettingsTab.tsx';
const LEGACY_SOURCE = `<div>
  <Button onClick={save}>Zapisz</Button>
</div>
`;

function regressionsFor(source, allowedSource = LEGACY_SOURCE) {
  const allowed = countViolationsByKey(collectViolationsFromContent(allowedSource, LEGACY_FILE));
  const current = countViolationsByKey(collectViolationsFromContent(source, LEGACY_FILE));
  return compareWithAllowlist(current, allowed);
}

test('allowlist keys carry no line number', () => {
  assert.deepEqual(countViolationsByKey(collectViolationsFromContent(LEGACY_SOURCE, LEGACY_FILE)), {
    [`${LEGACY_FILE}:Button`]: 1,
  });
});

test('lines added above an allowlisted element do not count as a new violation', () => {
  const shifted = `import { useState } from 'react';\n\n\n\n${LEGACY_SOURCE}`;

  assert.deepEqual(regressionsFor(shifted), []);
});

test('a new element without data-testid in an allowlisted file is a violation', () => {
  const grown = `${LEGACY_SOURCE}<Button onClick={cancel}>Anuluj</Button>\n`;

  assert.deepEqual(regressionsFor(grown), [{ key: `${LEGACY_FILE}:Button`, count: 2, allowed: 1 }]);
});

test('a new tag without data-testid is a violation even when the file total stays the same', () => {
  const swapped = `<div>\n  <Button data-testid="settings-save-btn" onClick={save}>Zapisz</Button>\n  <a href="/x">X</a>\n</div>\n`;

  assert.deepEqual(regressionsFor(swapped), [{ key: `${LEGACY_FILE}:a`, count: 1, allowed: 0 }]);
});

test('removing a legacy element is not a violation', () => {
  assert.deepEqual(regressionsFor('<div />\n'), []);
});
