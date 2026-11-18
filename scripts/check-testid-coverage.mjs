import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
const ALLOWLIST_PATH = path.join(ROOT_DIR, '.ai/quality/testid-allowlist.json');
const FILE_EXTENSION_PATTERN = /\.(tsx)$/;
const INTERACTIVE_TAGS = new Set([
  'Button',
  'Input',
  'Select',
  'Textarea',
  'Switch',
  'Checkbox',
  'RadioGroupItem',
  'DialogTrigger',
  'TabsTrigger',
  'a',
  'button',
  'input',
  'select',
  'textarea',
]);
const OPENING_TAG_PATTERN =
  /<(Button|Input|Select|Textarea|Switch|Checkbox|RadioGroupItem|DialogTrigger|TabsTrigger|a|button|input|select|textarea)\b/;

async function walkDirectory(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  let filePaths = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      filePaths = filePaths.concat(await walkDirectory(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (FILE_EXTENSION_PATTERN.test(entry.name)) {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

function findOpeningTagCloserIndex(chunk) {
  let braceDepth = 0;
  let quote = null;

  for (let index = 0; index < chunk.length; index += 1) {
    const char = chunk[index];
    const previous = index > 0 ? chunk[index - 1] : '';

    if (quote !== null) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      continue;
    }

    if (char === '>' && braceDepth === 0) {
      return index;
    }
  }

  return -1;
}

function readOpeningTag(lines, startIndex) {
  let chunk = lines[startIndex];
  let cursor = startIndex;

  while (findOpeningTagCloserIndex(chunk) === -1 && cursor + 1 < lines.length && cursor - startIndex < 12) {
    cursor += 1;
    chunk += `\n${lines[cursor]}`;
  }

  return { chunk, endIndex: cursor };
}

export function collectViolationsFromContent(content, relativePath) {
  const violations = [];
  const lines = content.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const match = line.match(OPENING_TAG_PATTERN);
    if (!match) {
      continue;
    }

    const tagName = match[1];
    if (!INTERACTIVE_TAGS.has(tagName)) {
      continue;
    }

    const { chunk } = readOpeningTag(lines, lineIndex);
    const hasTestId = /\bdata-testid\s*=/.test(chunk);

    if (hasTestId) {
      continue;
    }

    violations.push({
      id: `${relativePath}:${lineIndex + 1}:${tagName}`,
      file: relativePath,
      line: lineIndex + 1,
      tagName,
    });
  }

  return violations;
}

async function collectViolations() {
  const files = await walkDirectory(SOURCE_DIR);
  const violations = [];

  for (const filePath of files) {
    const relativePath = path.relative(ROOT_DIR, filePath).replaceAll(path.sep, '/');
    const content = await fs.readFile(filePath, 'utf8');
    violations.push(...collectViolationsFromContent(content, relativePath));
  }

  return violations;
}

export function countViolationsByKey(violations) {
  const counts = {};
  for (const { file, tagName } of violations) {
    const key = `${file}:${tagName}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// Klucz bez numeru linii: dopisanie linii nad starym elementem nie jest nowym naruszeniem.
export function compareWithAllowlist(currentCounts, allowedCounts) {
  const regressions = [];
  for (const [key, count] of Object.entries(currentCounts)) {
    const allowed = allowedCounts[key] ?? 0;
    if (count > allowed) {
      regressions.push({ key, count, allowed });
    }
  }
  return regressions.sort((left, right) => left.key.localeCompare(right.key));
}

function sumCounts(counts) {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

async function readAllowlist() {
  const content = await fs.readFile(ALLOWLIST_PATH, 'utf8');
  return JSON.parse(content).counts ?? {};
}

async function writeAllowlist(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
  const allowlist = {
    description:
      'Legacy interactive elements without data-testid, counted per file:tag. Numbers may only go down; CI fails when a count grows. Regenerate with npm run check:testids -- --update-allowlist after a cleanup.',
    total: sumCounts(sorted),
    counts: sorted,
  };

  await fs.mkdir(path.dirname(ALLOWLIST_PATH), { recursive: true });
  await fs.writeFile(ALLOWLIST_PATH, `${JSON.stringify(allowlist, null, 2)}\n`, 'utf8');
  console.log(`Updated allowlist: ${allowlist.total} legacy elements in ${Object.keys(sorted).length} file:tag keys.`);
}

function printRegressions(regressions, violations) {
  for (const { key, count, allowed } of regressions) {
    console.error(` - ${key}: ${count} (allowed ${allowed})`);
    for (const violation of violations) {
      if (`${violation.file}:${violation.tagName}` === key) {
        console.error(`     ${violation.id}`);
      }
    }
  }
}

async function main() {
  const violations = await collectViolations();
  const counts = countViolationsByKey(violations);
  const shouldUpdateAllowlist = process.argv.includes('--update-allowlist');

  if (shouldUpdateAllowlist) {
    const raised = compareWithAllowlist(counts, await readAllowlist().catch(() => ({})));
    if (raised.length > 0 && !process.argv.includes('--allow-increase')) {
      console.error('Refusing to raise the allowlist. Add data-testid to the new elements:');
      printRegressions(raised, violations);
      process.exit(1);
    }
    await writeAllowlist(counts);
    return;
  }

  const allowedCounts = await readAllowlist();
  const regressions = compareWithAllowlist(counts, allowedCounts);
  const unexpected = regressions.reduce((total, { count, allowed }) => total + count - allowed, 0);

  console.log(
    `data-testid guard: current=${violations.length}, allowlisted=${sumCounts(allowedCounts)}, unexpected=${unexpected}`
  );

  if (regressions.length > 0) {
    console.error('Found new interactive elements without data-testid (candidates listed by line):');
    printRegressions(regressions, violations);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Failed to evaluate data-testid guard.', error);
    process.exit(1);
  });
}
