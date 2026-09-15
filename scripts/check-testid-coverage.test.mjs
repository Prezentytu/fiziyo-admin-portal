import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectViolationsFromContent } from './check-testid-coverage.mjs';

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
