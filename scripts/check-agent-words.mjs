// Zapadka słów w kontekście ładowanym zawsze: AGENTS.md, CLAUDE.md, reguły Cursora z `alwaysApply: true`
// i .ai/lessons.md. Limitem jest suma słów (`total` w .ai/quality/agent-words-baseline.json); wolno ją tylko obniżać.
// Liczby per plik w baseline służą do raportu, co urosło; nową lekcję albo regułę opłacasz skróceniem dowolnego pliku.
//
//   node scripts/check-agent-words.mjs            exit 1, gdy suma przekracza limit
//   node scripts/check-agent-words.mjs --update   zapisz obecne liczby; odmawia podniesienia sumy
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

const sum = (counts) => Object.values(counts).reduce((total, count) => total + count, 0);

// Files that grew against their recorded count; a file missing from the baseline counts from 0.
export function grown(counts, files) {
  return Object.entries(counts)
    .filter(([file, count]) => count > (files[file] ?? 0))
    .map(([file, count]) => ({ file, count, before: files[file] ?? 0 }));
}

export function readBaseline(root) {
  const file = path.join(root, BASELINE);
  if (!fs.existsSync(file)) return null;
  const { total, files = {} } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { total, files };
}

export function run(root, { update = false } = {}) {
  const counts = measure(root);
  const total = sum(counts);
  const baseline = readBaseline(root);
  const limit = baseline?.total ?? 0;
  const over = total > limit;
  const details = { total, limit, grown: grown(counts, baseline?.files ?? {}) };
  if (update) {
    if (over && baseline) return { ok: false, ...details, message: 'Refusing to raise the word limit:' };
    const payload = {
      note: 'Words in always-loaded agent context. The total may only go down: node scripts/check-agent-words.mjs --update.',
      total,
      files: counts,
    };
    fs.mkdirSync(path.dirname(path.join(root, BASELINE)), { recursive: true });
    fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(payload, null, 2)}\n`);
    return { ok: true, ...details, limit: total, message: `Agent word limit updated: ${total} words.` };
  }
  if (over) {
    return {
      ok: false,
      ...details,
      message: `Always-loaded agent context grew to ${total} words (limit ${limit}). Shorten any of these files, move text to a file read on demand, or archive old lessons:`,
    };
  }
  return { ok: true, ...details, message: `Agent context within word limit (${total}/${limit} words).` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(process.cwd(), { update: process.argv.includes('--update') });
  if (result.ok) console.log(result.message);
  else {
    console.error(result.message);
    for (const { file, count, before } of result.grown) console.error(`  ${file}: ${before} → ${count} words`);
    process.exitCode = 1;
  }
}
