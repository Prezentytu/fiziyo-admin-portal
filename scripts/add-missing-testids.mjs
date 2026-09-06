import fs from 'node:fs/promises';
import path from 'node:path';
import { readOpeningTag } from './lib/read-opening-tag.mjs';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
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

function modulePrefix(relativePath) {
  if (relativePath.includes('/(auth)/') || relativePath.includes('/features/auth/')) {
    return 'auth';
  }
  if (relativePath.includes('/patients')) {
    return 'patient';
  }
  if (relativePath.includes('/exercise-sets') || relativePath.includes('/exercise-builder')) {
    return 'set';
  }
  if (relativePath.includes('/exercises') || relativePath.includes('/verification')) {
    return relativePath.includes('/verification') ? 'verification' : 'exercise';
  }
  if (relativePath.includes('/organization')) {
    return 'org';
  }
  if (relativePath.includes('/settings')) {
    return 'settings';
  }
  if (relativePath.includes('/finances') || relativePath.includes('/billing')) {
    return 'finances';
  }
  if (relativePath.includes('/import')) {
    return 'import';
  }
  if (relativePath.includes('/assignment')) {
    return 'assignment';
  }
  if (relativePath.includes('/layout') || relativePath.includes('/components/layout')) {
    return 'nav';
  }
  return 'common';
}

function tagSuffix(tagName) {
  const normalized = tagName.toLowerCase();
  if (normalized === 'button' || normalized === 'dialogtrigger' || normalized === 'a') {
    return 'btn';
  }
  if (normalized === 'tabstrigger') {
    return 'tab';
  }
  if (normalized === 'radiogroupitem') {
    return 'radio';
  }
  return normalized;
}

function toKebab(value) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[^a-zA-Z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .toLowerCase();
}

function buildTestId(relativePath, tagName, lineNumber, usedIds) {
  const fileName = path.basename(relativePath, '.tsx');
  const base = `${modulePrefix(relativePath)}-${toKebab(fileName)}-${tagSuffix(tagName)}`;
  let candidate = `${base}-${lineNumber}`;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${lineNumber}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

async function walkDirectory(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  let filePaths = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths = filePaths.concat(await walkDirectory(fullPath));
      continue;
    }
    if (entry.isFile() && FILE_EXTENSION_PATTERN.test(entry.name)) {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

function insertTestId(line, tagName, testId) {
  const pattern = new RegExp(`<(${tagName})\\b`);
  const match = line.match(pattern);
  if (!match || match.index === undefined) {
    return line;
  }

  const insertAt = match.index + match[0].length;
  const alreadyHas = /\bdata-testid\s*=/.test(line);
  if (alreadyHas) {
    return line;
  }

  return `${line.slice(0, insertAt)} data-testid="${testId}"${line.slice(insertAt)}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = await walkDirectory(SOURCE_DIR);
  const usedIds = new Set();
  let added = 0;

  for (const filePath of files) {
    const relativePath = path.relative(ROOT_DIR, filePath).replaceAll(path.sep, '/');
    const original = await fs.readFile(filePath, 'utf8');
    const lines = original.split('\n');
    let changed = false;

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
      if (/\bdata-testid\s*=/.test(chunk)) {
        continue;
      }

      const testId = buildTestId(relativePath, tagName, lineIndex + 1, usedIds);
      lines[lineIndex] = insertTestId(line, tagName, testId);
      if (lines[lineIndex] !== line) {
        changed = true;
        added += 1;
      }
    }

    if (changed && !dryRun) {
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
    }
  }

  console.log(`${dryRun ? 'Would add' : 'Added'} ${added} data-testid attributes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
