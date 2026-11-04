import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { BASELINE, countWords, isAlwaysApply, readLimits, run, trackedFiles } from './check-agent-words.mjs';

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

test('limit may only go down: growth fails, update refuses to raise, shrink lowers the limit', () => {
  const { root, write } = fixture();
  try {
    assert.equal(run(root).ok, false, 'no baseline means limit 0');
    assert.equal(run(root, { update: true }).ok, true, 'first update creates the baseline');
    assert.equal(readLimits(root)['AGENTS.md'], 5);
    fs.writeFileSync(
      path.join(root, BASELINE),
      JSON.stringify({ files: { 'AGENTS.md': 5, '.ai/lessons.md': 2, '.cursor/rules/zawsze.mdc': 99 } })
    );
    assert.equal(run(root).ok, true);

    write('AGENTS.md', '# Agents\n\njeden dwa trzy cztery\n');
    const grown = run(root);
    assert.equal(grown.ok, false);
    assert.deepEqual(grown.over, [{ file: 'AGENTS.md', count: 6, limit: 5 }]);
    assert.equal(run(root, { update: true }).ok, false);
    assert.equal(readLimits(root)['AGENTS.md'], 5);

    write('AGENTS.md', '# Agents\n');
    assert.equal(run(root, { update: true }).ok, true);
    assert.equal(readLimits(root)['AGENTS.md'], 2);
    assert.equal(readLimits(root)['.cursor/rules/zawsze.mdc'], 8);

    write('.cursor/rules/nowa.mdc', '---\nalwaysApply: true\n---\n\nnowa reguła\n');
    assert.deepEqual(
      run(root).over.map(({ file }) => file),
      ['.cursor/rules/nowa.mdc']
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
