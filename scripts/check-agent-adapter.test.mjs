import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { checkAdapter } from './check-agent-adapter.mjs';

function writeFixture(root, extra = {}) {
  fs.mkdirSync(path.join(root, '.ai'));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'instructions');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { check: 'exit 99' } }));
  const adapter = {
    schemaVersion: 1,
    repository: 'owner/repo',
    externalRepositories: [],
    skillRoot: null,
    instructions: ['AGENTS.md'],
    surfaces: ['package.json'],
    checks: [{ command: 'npm', args: ['run', 'check'], cwd: '.' }],
    activation: 'unverified',
    portableSurfaceOverrides: [],
    portableSurfaceExcluded: [],
    ...extra,
  };
  const save = () => fs.writeFileSync(path.join(root, '.ai/agent-adapter.json'), JSON.stringify(adapter));
  save();
  return { adapter, save };
}

test('adapter checks command and instruction availability without execution', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-'));
  try {
    const { adapter, save } = writeFixture(root);
    assert.deepEqual(checkAdapter(root), []);
    adapter.checks[0].args[1] = 'invented';
    save();
    assert.match(checkAdapter(root).join(), /Missing npm script/);
    adapter.instructions = ['../outside'];
    save();
    assert.match(checkAdapter(root).join(), /unsafe instructions/);
    adapter.instructions = ['AGENTS.md'];
    adapter.checks[0].args[1] = 'check';
    save();
    const parser = path.resolve('scripts/task-card.mjs');
    const result = spawnSync(process.execPath, [parser, 'check'], {
      cwd: root,
      encoding: 'utf8',
      input: '```task-card\nCel: Test\nTryb: advise\nRepo: owner/repo\nZlecił: example\n```',
    });
    assert.equal(result.status, 0, result.stderr);
    fs.rmSync(path.join(root, '.ai/agent-adapter.json'));
    const missing = spawnSync(process.execPath, [parser, 'check'], {
      cwd: root,
      encoding: 'utf8',
      input: '```task-card\nCel: Test\nTryb: advise\nRepo: owner/repo\nZlecił: example\n```',
    });
    assert.notEqual(missing.status, 0);
    assert.match(String(missing.stderr), /agent-adapter/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('portable surface lists are relative, unique, and match existence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-surface-'));
  try {
    const { adapter, save } = writeFixture(root);
    adapter.portableSurfaceOverrides = ['package.json'];
    adapter.portableSurfaceExcluded = ['canonical-missing.md'];
    save();
    assert.deepEqual(checkAdapter(root), []);

    adapter.portableSurfaceOverrides = ['../outside'];
    save();
    assert.match(checkAdapter(root).join(), /Unsafe portableSurfaceOverrides/);

    adapter.portableSurfaceOverrides = ['missing-override.md'];
    adapter.portableSurfaceExcluded = [];
    save();
    assert.match(checkAdapter(root).join(), /Missing portableSurfaceOverrides/);

    adapter.portableSurfaceOverrides = [];
    adapter.portableSurfaceExcluded = ['package.json'];
    save();
    assert.match(checkAdapter(root).join(), /portableSurfaceExcluded must not exist/);

    adapter.portableSurfaceOverrides = ['package.json', 'package.json'];
    adapter.portableSurfaceExcluded = [];
    save();
    assert.match(checkAdapter(root).join(), /Duplicate portableSurfaceOverrides/);

    adapter.portableSurfaceOverrides = ['package.json'];
    adapter.portableSurfaceExcluded = ['package.json'];
    save();
    assert.match(checkAdapter(root).join(), /both portableSurfaceOverrides and portableSurfaceExcluded/);

    delete adapter.portableSurfaceOverrides;
    adapter.portableSurfaceExcluded = [];
    save();
    assert.match(checkAdapter(root).join(), /Missing portableSurfaceOverrides/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
