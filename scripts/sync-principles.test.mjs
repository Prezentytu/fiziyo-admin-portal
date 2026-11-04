import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { canonPath, render, syncNote, syncPrinciples } from './sync-principles.mjs';

const canon = (name, extra = '') => `---\nname: ${name}\ndescription: "Opis"\n---\n\n# Tytuł\n\nTreść.${extra}\n`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'principles-'));
  fs.mkdirSync(path.join(root, '.ai/skills'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.ai/skills/manifest.json'),
    JSON.stringify({ version: 1, tiers: { principles: ['principle-a'] } })
  );
  return root;
}

test('render keeps frontmatter first, puts the canon note under the title and adapts commands', () => {
  const text = render('principle-a', canon('principle-a', ' Uruchom `npm run agent -- check`.'));
  const lines = text.split('\n');
  assert.equal(lines[0], '---');
  assert.equal(lines[1], 'name: principle-a');
  assert.equal(lines[5], '# Tytuł');
  assert.equal(lines[7], syncNote('principle-a'));
  assert.match(syncNote('principle-a'), /fizjo-app\/\.agents\/skills\/principle-a\/SKILL\.md/);
  assert.match(text, /`npm run agent:check`/);
  assert.doesNotMatch(text, /agent -- check/);
  assert.throws(() => render('x', '# brak frontmattera\n'), /no frontmatter/);
});

test('check reports drift without writing, sync writes, then check is clean', () => {
  const root = fixture();
  try {
    const read = (_dir, file) => {
      const name = file.split('/')[2];
      assert.equal(file, canonPath(name));
      return canon(name);
    };
    const local = path.join(root, '.ai/skills/principle-a/SKILL.md');
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, 'stara kopia\n');

    const checked = syncPrinciples(root, { check: true, sourceDir: root, read });
    assert.deepEqual(checked.drift, ['principle-a', 'sec-report']);
    assert.equal(fs.readFileSync(local, 'utf8'), 'stara kopia\n');
    assert.equal(fs.existsSync(path.join(root, '.ai/skills/sec-report/SKILL.md')), false);

    syncPrinciples(root, { sourceDir: root, read });
    assert.equal(fs.readFileSync(local, 'utf8'), render('principle-a', canon('principle-a')));
    assert.deepEqual(syncPrinciples(root, { check: true, sourceDir: root, read }).drift, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('reads canon from origin/main, not from the working tree of fizjo-app', () => {
  const root = fixture();
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'fizjo-remote-'));
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'fizjo-app-'));
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  try {
    git(remote, 'init', '-q', '-b', 'main');
    git(remote, 'config', 'user.email', 't@example.com');
    git(remote, 'config', 'user.name', 't');
    for (const name of ['principle-a', 'sec-report']) {
      fs.mkdirSync(path.join(remote, path.dirname(canonPath(name))), { recursive: true });
      fs.writeFileSync(path.join(remote, canonPath(name)), canon(name));
    }
    git(remote, 'add', '.');
    git(remote, 'commit', '-q', '-m', 'canon');
    fs.rmSync(source, { recursive: true });
    git(os.tmpdir(), 'clone', '-q', remote, source);
    git(source, 'checkout', '-q', '-b', 'inna-galaz');
    fs.writeFileSync(path.join(source, canonPath('principle-a')), canon('principle-a', ' Brudne drzewo.'));

    syncPrinciples(root, { sourceDir: source });
    const text = fs.readFileSync(path.join(root, '.ai/skills/principle-a/SKILL.md'), 'utf8');
    assert.doesNotMatch(text, /Brudne drzewo/);
    assert.equal(text, render('principle-a', canon('principle-a')));
  } finally {
    for (const dir of [root, remote, source]) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('missing fizjo-app checkout is a clear error', () => {
  const root = fixture();
  try {
    assert.throws(
      () => syncPrinciples(root, { sourceDir: path.join(root, 'nie-ma') }),
      /fizjo-app checkout not found.*FIZJO_APP_DIR/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
