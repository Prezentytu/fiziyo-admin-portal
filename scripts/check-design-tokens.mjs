import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
const BASELINE_PATH = path.join(ROOT_DIR, '.ai/quality/design-token-baseline.json');
const FILE_EXTENSION_PATTERN = /\.(ts|tsx)$/;
const IGNORED_PATH_PATTERN = /(__tests__|\.test\.tsx?$|\.spec\.tsx?$|src\/components\/pdf\/)/;

const COLOR_UTILITY_PREFIX = '(?:bg|text|border|from|via|to|ring|fill|stroke|outline|decoration|divide|placeholder|shadow|accent|caret)';
const RAW_PALETTE =
  '(?:zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';

export const VIOLATION_PATTERNS = [
  { id: 'arbitrary-hex', pattern: new RegExp(`\\b${COLOR_UTILITY_PREFIX}-\\[#[0-9a-fA-F]{3,8}\\]`, 'g') },
  { id: 'raw-palette', pattern: new RegExp(`\\b${COLOR_UTILITY_PREFIX}-${RAW_PALETTE}-\\d{2,3}\\b`, 'g') },
  { id: 'inline-hex', pattern: /\b(?:color|background|backgroundColor|borderColor|fill|stroke)\s*:\s*['"`]#[0-9a-fA-F]{3,8}/g },
];

export function countViolations(source) {
  return VIOLATION_PATTERNS.reduce((total, { pattern }) => total + (source.match(pattern)?.length ?? 0), 0);
}

export function compareWithBaseline(currentCounts, baselineCounts) {
  const regressions = [];
  for (const [filePath, count] of Object.entries(currentCounts)) {
    const allowed = baselineCounts[filePath] ?? 0;
    if (count > allowed) {
      regressions.push({ filePath, count, allowed });
    }
  }
  return regressions.sort((left, right) => left.filePath.localeCompare(right.filePath));
}

async function walkDirectory(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) return walkDirectory(fullPath);
      return entry.isFile() && FILE_EXTENSION_PATTERN.test(entry.name) ? [fullPath] : [];
    })
  );
  return nested.flat();
}

async function collectCounts() {
  const filePaths = await walkDirectory(SOURCE_DIR);
  const counts = {};
  for (const filePath of filePaths) {
    const relativePath = path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
    if (IGNORED_PATH_PATTERN.test(relativePath)) continue;
    const count = countViolations(await fs.readFile(filePath, 'utf8'));
    if (count > 0) counts[relativePath] = count;
  }
  return counts;
}

async function readBaseline() {
  try {
    return JSON.parse(await fs.readFile(BASELINE_PATH, 'utf8')).files ?? {};
  } catch {
    return {};
  }
}

async function writeBaseline(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
  const total = Object.values(sorted).reduce((sum, count) => sum + count, 0);
  const payload = {
    note: 'Colors outside DS tokens per file (docs/design-system.md). Numbers may only go down. Regenerate with npm run check:design-tokens -- --update after a cleanup.',
    total,
    files: sorted,
  };
  await fs.mkdir(path.dirname(BASELINE_PATH), { recursive: true });
  await fs.writeFile(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return total;
}

async function main() {
  const counts = await collectCounts();
  const baseline = await readBaseline();

  if (process.argv.includes('--update')) {
    const raised = compareWithBaseline(counts, baseline);
    if (raised.length > 0 && !process.argv.includes('--allow-increase')) {
      console.error('Refusing to raise the baseline. Use DS tokens instead:');
      for (const { filePath, count, allowed } of raised) console.error(`  ${filePath}: ${allowed} → ${count}`);
      process.exit(1);
    }
    const total = await writeBaseline(counts);
    console.log(`Design token baseline updated: ${total} legacy colors left.`);
    return;
  }

  const regressions = compareWithBaseline(counts, baseline);
  if (regressions.length > 0) {
    console.error('New colors outside the design system. Use tokens from docs/design-system.md:');
    for (const { filePath, count, allowed } of regressions) console.error(`  ${filePath}: ${count} (allowed ${allowed})`);
    process.exit(1);
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`Design tokens OK (${total} legacy colors left to migrate).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
