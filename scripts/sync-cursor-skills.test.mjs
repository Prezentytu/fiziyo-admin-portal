import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./sync-cursor-skills.mjs', import.meta.url));
const skill = '---\nname: demo\ndescription: Test skill\n---\nCanonical content\n';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-sync-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const write = async (name, content) => {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), content);
  };
  await write('.ai/skills/manifest.json', JSON.stringify({ tiers: { core: ['demo'] } }));
  await write('.ai/skills/demo/SKILL.md', skill);
  await write('.ai/skills/demo/references/example.txt', 'reference');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
  return { root, write, run, read: (name) => fs.readFile(path.join(root, name), 'utf8') };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr);
}

function failure(result, message) {
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
}

test('lint is source-only; sync creates both mirrors, overwrites canonical files and is idempotent', async (t) => {
  const f = await fixture(t);
  success(f.run('--lint'));
  failure(f.run('--check'), /Missing mirror/);
  success(f.run());
  for (const mirror of ['.cursor', '.agents']) {
    assert.equal(await f.read(`${mirror}/skills/demo/SKILL.md`), skill);
    assert.equal(await f.read(`${mirror}/skills/demo/references/example.txt`), 'reference');
  }
  success(f.run('--check'));
  await f.write('.agents/skills/demo/SKILL.md', 'stale');
  failure(f.run('--check'), /Mirror drift/);
  assert.equal(await f.read('.agents/skills/demo/SKILL.md'), 'stale');
  success(f.run());
  success(f.run());
  success(f.run('--check'));
});

for (const extra of ['unknown/SKILL.md', 'demo/local.txt', 'extra.txt']) {
  test(`extra ${extra} in second mirror blocks writes to both mirrors and remains intact`, async (t) => {
    const f = await fixture(t);
    success(f.run());
    await f.write('.cursor/skills/demo/SKILL.md', 'stale');
    await f.write(`.agents/skills/${extra}`, 'local work');
    failure(f.run(), /Extra mirror entry/);
    assert.equal(await f.read('.cursor/skills/demo/SKILL.md'), 'stale');
    assert.equal(await f.read(`.agents/skills/${extra}`), 'local work');
    success(f.run('--lint'));
  });
}

for (const target of ['.agents', '.agents/skills', '.agents/skills/demo', '.agents/skills/demo/SKILL.md']) {
  test(`rejects symlink at ${target} before writing first mirror`, async (t) => {
    const f = await fixture(t);
    await f.write('.cursor/skills/demo/SKILL.md', 'stale');
    const external = path.join(f.root, 'external');
    await fs.mkdir(external);
    await fs.mkdir(path.dirname(path.join(f.root, target)), { recursive: true });
    await fs.symlink(external, path.join(f.root, target));
    failure(f.run(), /real directory|symlink/);
    assert.equal(await f.read('.cursor/skills/demo/SKILL.md'), 'stale');
    assert.deepEqual(await fs.readdir(external), []);
  });
}

for (const target of ['demo', 'demo/SKILL.md']) {
  test(`rejects file/directory conflict at ${target}`, async (t) => {
    const f = await fixture(t);
    await f.write('.cursor/skills/demo/SKILL.md', 'stale');
    if (target === 'demo') await f.write(`.agents/skills/${target}`, 'keep');
    else await fs.mkdir(path.join(f.root, '.agents/skills', target), { recursive: true });
    failure(f.run(), /File\/directory conflict/);
    assert.equal(await f.read('.cursor/skills/demo/SKILL.md'), 'stale');
  });
}

for (const entry of ['../outside', '.', '..', '/absolute', 'nested/path', 'nested\\path']) {
  test(`rejects unsafe manifest entry ${entry}`, async (t) => {
    const f = await fixture(t);
    await f.write('.ai/skills/manifest.json', JSON.stringify({ tiers: { core: [entry] } }));
    failure(f.run('--lint'), /invalid skill entry/);
  });
}

test('rejects source symlinks and missing mirror entries', async (t) => {
  const f = await fixture(t);
  success(f.run());
  await fs.unlink(path.join(f.root, '.agents/skills/demo/references/example.txt'));
  failure(f.run('--check'), /Mirror drift/);
  await fs.symlink('SKILL.md', path.join(f.root, '.ai/skills/demo/linked.md'));
  failure(f.run('--lint'), /symlink/);
});
