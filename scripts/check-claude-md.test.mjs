import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkClaudeMd } from './check-claude-md.mjs';

function fixture(context, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-md-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

test('moduł z CLAUDE.md importującym AGENTS.md przechodzi; korzeń i node_modules są pomijane', (context) => {
  const root = fixture(context, {
    'AGENTS.md': '# root',
    'backend/AGENTS.md': '# backend',
    'backend/CLAUDE.md': '@AGENTS.md\n',
    'node_modules/pkg/AGENTS.md': '# obce',
  });
  assert.deepEqual(checkClaudeMd(root), []);
});

test('pada na module bez CLAUDE.md i na CLAUDE.md bez importu', (context) => {
  const root = fixture(context, {
    'components/patient/AGENTS.md': '# pacjent',
    'src/graphql/AGENTS.md': '# graphql',
    'src/graphql/CLAUDE.md': 'Zobacz AGENTS.md\n',
  });
  const errors = checkClaudeMd(root).join('\n');
  assert.match(errors, /components\/patient: AGENTS\.md bez CLAUDE\.md/);
  assert.match(errors, /src\/graphql\/CLAUDE\.md: nie importuje/);
});
