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

async function readAllowlist() {
  const content = await fs.readFile(ALLOWLIST_PATH, 'utf8');
  return JSON.parse(content);
}

async function writeAllowlist(violations) {
  const allowlist = {
    generatedAt: new Date().toISOString(),
    description:
      'Legacy interactive elements without data-testid. Keep shrinking this list; CI fails on new entries.',
    entries: violations.map((violation) => violation.id).sort(),
  };

  await fs.mkdir(path.dirname(ALLOWLIST_PATH), { recursive: true });
  await fs.writeFile(ALLOWLIST_PATH, `${JSON.stringify(allowlist, null, 2)}\n`, 'utf8');
  console.log(`Updated allowlist with ${allowlist.entries.length} entries.`);
}

async function main() {
  const violations = await collectViolations();
  const shouldUpdateAllowlist = process.argv.includes('--update-allowlist');

  if (shouldUpdateAllowlist) {
    await writeAllowlist(violations);
    return;
  }

  const allowlist = await readAllowlist();
  const allowedEntries = new Set(allowlist.entries);
  const unexpectedViolations = violations.filter((violation) => !allowedEntries.has(violation.id));

  console.log(
    `data-testid guard: current=${violations.length}, allowlisted=${allowedEntries.size}, unexpected=${unexpectedViolations.length}`
  );

  if (unexpectedViolations.length > 0) {
    const preview = unexpectedViolations.slice(0, 20).map((entry) => ` - ${entry.id}`).join('\n');
    console.error(
      `Found new interactive elements without data-testid:\n${preview}\n${
        unexpectedViolations.length > 20 ? ' - ...' : ''
      }`
    );
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Failed to evaluate data-testid guard.', error);
    process.exit(1);
  });
}
