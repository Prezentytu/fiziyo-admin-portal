import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { countWords, isAlwaysApply, readBaseline, run, trackedFiles } from './check-agent-words.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-words-'));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('AGENTS.md', '# Agents\n\njeden dwa trzy\n');
  write('.ai/lessons.md', 'lekcja jedna\n');
  write('.cursor/rules/zawsze.mdc', '---\ndescription: x\nalwaysApply: true\n---\n\n- reguła\n');
  write('.cursor/rules/glob.mdc', '---\ndescription: x\nalwaysApply: false\n---\n\n- reguła z globem\n');
  return { root, write };
}

test('counts words like wc -w and detects alwaysApply only in frontmatter', () => {
  assert.equal(countWords('  jeden\n\ndwa\tczy  '), 3);
  assert.equal(isAlwaysApply('---\nalwaysApply: true\n---\n'), true);
  assert.equal(isAlwaysApply('---\nalwaysApply: false\n---\nalwaysApply: true\n'), false);
});

test('tracks AGENTS.md, lessons and alwaysApply rules, not glob rules', () => {
  const { root } = fixture();
  try {
    assert.deepEqual(trackedFiles(root), ['.ai/lessons.md', '.cursor/rules/zawsze.mdc', 'AGENTS.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('total may only go down: growth fails, update refuses to raise, trimming any file pays for growth', () => {
  const { root, write } = fixture();
  try {
    assert.equal(run(root).ok, false, 'no baseline means limit 0');
    assert.equal(run(root, { update: true }).ok, true, 'first update creates the baseline');
    assert.equal(readBaseline(root).files['AGENTS.md'], 5);
    const start = readBaseline(root).total;
    assert.equal(run(root).ok, true);

    write('.ai/lessons.md', 'lekcja jedna i druga\n');
    const grownRun = run(root);
    assert.equal(grownRun.ok, false);
    assert.deepEqual(grownRun.grown, [{ file: '.ai/lessons.md', count: 4, before: 2 }]);
    assert.equal(run(root, { update: true }).ok, false);
    assert.equal(readBaseline(root).total, start);

    write('AGENTS.md', '# Agents\n\njeden\n');
    assert.equal(run(root).ok, true, 'new lesson paid for by a shorter AGENTS.md');
    write('AGENTS.md', '# Agents\n');
    assert.equal(run(root, { update: true }).ok, true);
    assert.equal(readBaseline(root).total, start - 1);

    write('.cursor/rules/nowa.mdc', '---\nalwaysApply: true\n---\n\nnowa reguła\n');
    const newRule = run(root);
    assert.equal(newRule.ok, false);
    assert.deepEqual(
      newRule.grown.map(({ file }) => file),
      ['.cursor/rules/nowa.mdc']
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
