// Claude Code wczytuje `CLAUDE.md` z podkatalogu, gdy agent otwiera plik w tym podkatalogu (także w chmurze, bez hooków),
// ale samego `AGENTS.md` nie wczytuje. Modułowy `AGENTS.md` bez `CLAUDE.md` obok jest więc dla Claude Code niewidoczny.
// Każdy katalog z `AGENTS.md` (poza korzeniem) ma obok `CLAUDE.md`, który go importuje (`@AGENTS.md`).
//   npm run check:claude-md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'out']);

export function agentsDirs(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !entry.isSymbolicLink()) walk(path.join(dir, entry.name));
      } else if (entry.name === 'AGENTS.md' && dir !== root) out.push(path.relative(root, dir));
    }
  };
  walk(root);
  return out.sort();
}

export function checkClaudeMd(root) {
  const errors = [];
  for (const dir of agentsDirs(root)) {
    const file = path.join(root, dir, 'CLAUDE.md');
    if (!fs.existsSync(file)) errors.push(`${dir}: AGENTS.md bez CLAUDE.md obok (dodaj plik z linią \`@AGENTS.md\`)`);
    else if (!/^@AGENTS\.md\s*$/m.test(fs.readFileSync(file, 'utf8')))
      errors.push(`${dir}/CLAUDE.md: nie importuje \`@AGENTS.md\``);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = checkClaudeMd(root);
  for (const error of errors) console.error(`CLAUDE.md: ${error}`);
  if (errors.length) process.exit(1);
  console.log(`CLAUDE.md: ${agentsDirs(root).length} modułowych AGENTS.md, każdy widoczny dla Claude Code.`);
}
