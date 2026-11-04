// Zapadka słów w kontekście ładowanym zawsze: AGENTS.md, CLAUDE.md, reguły Cursora z `alwaysApply: true`
// i .ai/lessons.md. Każdy plik ma limit w .ai/quality/agent-words-baseline.json; limit wolno tylko obniżać.
//
//   node scripts/check-agent-words.mjs            exit 1, gdy plik przekracza limit albo nie ma limitu
//   node scripts/check-agent-words.mjs --update   zapisz obecne liczby; odmawia podniesienia limitu
//                                                 (bez pliku limitów tworzy go z obecnych liczb)
//
// Nowa treść wchodzi kosztem starej: skróć, przenieś do pliku czytanego na żądanie albo zarchiwizuj lekcję.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASELINE = '.ai/quality/agent-words-baseline.json';
const FIXED = ['AGENTS.md', 'CLAUDE.md', '.ai/lessons.md'];
const RULES_DIR = '.cursor/rules';

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function isAlwaysApply(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  return Boolean(match && /^alwaysApply:\s*true\s*$/m.test(match[1]));
}

export function trackedFiles(root) {
  const rulesDir = path.join(root, RULES_DIR);
  const rules = fs.existsSync(rulesDir)
    ? fs
        .readdirSync(rulesDir)
        .filter((name) => name.endsWith('.mdc'))
        .map((name) => `${RULES_DIR}/${name}`)
        .filter((file) => isAlwaysApply(fs.readFileSync(path.join(root, file), 'utf8')))
    : [];
  return [...FIXED.filter((file) => fs.existsSync(path.join(root, file))), ...rules].sort();
}

export function measure(root) {
  return Object.fromEntries(
    trackedFiles(root).map((file) => [file, countWords(fs.readFileSync(path.join(root, file), 'utf8'))])
  );
}

export function compare(counts, limits) {
  return Object.entries(counts)
    .filter(([file, count]) => count > (limits[file] ?? 0))
    .map(([file, count]) => ({ file, count, limit: limits[file] ?? 0 }));
}

export function readLimits(root) {
  const file = path.join(root, BASELINE);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')).files ?? {}) : {};
}

export function run(root, { update = false } = {}) {
  const counts = measure(root);
  const bootstrap = !fs.existsSync(path.join(root, BASELINE));
  const over = compare(counts, readLimits(root));
  if (update) {
    if (over.length && !bootstrap) return { ok: false, over, message: 'Refusing to raise the word limit:' };
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const payload = {
      note: 'Words in always-loaded agent context. Limits may only go down: node scripts/check-agent-words.mjs --update.',
      total,
      files: counts,
    };
    fs.mkdirSync(path.dirname(path.join(root, BASELINE)), { recursive: true });
    fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(payload, null, 2)}\n`);
    return { ok: true, over: [], message: `Agent word limits updated: ${total} words.` };
  }
  if (over.length) {
    return {
      ok: false,
      over,
      message: 'Always-loaded agent context grew. Shorten, move to a file read on demand, or archive old lessons:',
    };
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { ok: true, over: [], message: `Agent context within word limits (${total} words).` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(process.cwd(), { update: process.argv.includes('--update') });
  if (result.ok) console.log(result.message);
  else {
    console.error(result.message);
    for (const { file, count, limit } of result.over) console.error(`  ${file}: ${count} words (limit ${limit})`);
    process.exitCode = 1;
  }
}
