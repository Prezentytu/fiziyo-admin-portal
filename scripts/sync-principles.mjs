// Kopie zasad inżynierskich (tier `principles` z .ai/skills/manifest.json) i sec-report z kanonu
// Prezentytu/fizjo-app: .agents/skills/<nazwa>/SKILL.md na origin/main.
//
//   npm run principles:sync     zapisz kopie w .ai/skills/<nazwa>/SKILL.md
//   npm run principles:check    exit 1, gdy kopia różni się od kanonu (nic nie zapisuje)
//
// Czyta z sąsiedniego checkoutu fizjo-app przez `git show origin/main:<ścieżka>`, więc gałąź
// i brudne drzewo robocze fizjo-app nie mają znaczenia. Świeżość kanonu to `git -C <fizjo-app> fetch`.
// Checkout: FIZJO_APP_DIR albo katalog fizjo-app obok głównego checkoutu tego repo (działa też z worktree).
// Tylko lokalnie: CI nie ma dostępu do prywatnego fizjo-app.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_REF = 'origin/main';
export const EXTRA_SKILLS = ['sec-report'];

// Kanon mówi komendami fizjo-app; tu jest inna nazwa skryptu.
export const LOCAL_REPLACEMENTS = [['npm run agent -- check', 'npm run agent:check']];

export function canonPath(name) {
  return `.agents/skills/${name}/SKILL.md`;
}

export function syncNote(name) {
  return `> **Kopia z kanonu:** \`fizjo-app/${canonPath(name)}\` (${SOURCE_REF}). Nie edytuj tutaj: zmień w fizjo-app, potem \`npm run principles:sync\`.`;
}

export function render(name, canon) {
  const match = /^---\n[\s\S]*?\n---\n/.exec(canon);
  if (!match) throw new Error(`${canonPath(name)}: canon has no frontmatter`);
  let body = canon.slice(match[0].length).replace(/^\n+/, '');
  for (const [from, to] of LOCAL_REPLACEMENTS) body = body.split(from).join(to);
  const [title, ...rest] = body.split('\n');
  if (!title.startsWith('# ')) throw new Error(`${canonPath(name)}: canon body must start with a # title`);
  return `${match[0]}\n${title}\n\n${syncNote(name)}\n\n${rest.join('\n').replace(/^\n+/, '')}`;
}

export function skillNames(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.ai/skills/manifest.json'), 'utf8'));
  return [...(manifest.tiers?.principles ?? []), ...EXTRA_SKILLS];
}

export function defaultSourceDir(root) {
  if (process.env.FIZJO_APP_DIR) return path.resolve(process.env.FIZJO_APP_DIR);
  const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return path.join(path.dirname(path.dirname(commonDir)), 'fizjo-app');
}

export function gitShow(sourceDir, file) {
  return execFileSync('git', ['-C', sourceDir, 'show', `${SOURCE_REF}:${file}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function syncPrinciples(root, { check = false, sourceDir = defaultSourceDir(root), read = gitShow } = {}) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`fizjo-app checkout not found at ${sourceDir}; set FIZJO_APP_DIR`);
  }
  const drift = [];
  const report = [];
  for (const name of skillNames(root)) {
    const local = path.join(root, '.ai/skills', name, 'SKILL.md');
    const next = render(name, read(sourceDir, canonPath(name)));
    const current = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : null;
    if (current === next) {
      report.push(`ok       ${name}`);
      continue;
    }
    drift.push(name);
    if (check) report.push(`drift    ${name} (npm run principles:sync)`);
    else {
      fs.mkdirSync(path.dirname(local), { recursive: true });
      fs.writeFileSync(local, next);
      report.push(`updated  ${name}`);
    }
  }
  return { drift, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  try {
    const { drift, report } = syncPrinciples(process.cwd(), { check });
    console.log(report.join('\n'));
    if (check && drift.length) process.exitCode = 1;
  } catch (error) {
    console.error(`principles:${check ? 'check' : 'sync'} failed: ${error.stderr || error.message}`);
    process.exitCode = 2;
  }
}
