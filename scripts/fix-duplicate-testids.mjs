import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = path.join(process.cwd(), 'src');
const AUTO_TESTID =
  /\sdata-testid="[a-z0-9-]*?(button|input|select|textarea|switch|checkbox|radiogroupitem|dialogtrigger|tabstrigger|a)-\d+"/i;

async function walk(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = await walk(SOURCE_DIR);
  let removed = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, 'utf8');
    const lines = original.split('\n');
    let changed = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      if (!AUTO_TESTID.test(lines[lineIndex])) {
        continue;
      }

      const windowLines = lines.slice(lineIndex, lineIndex + 30).join('\n');
      const testIdCount = (windowLines.match(/data-testid=/g) || []).length;
      if (testIdCount < 2) {
        continue;
      }

      let next = lines[lineIndex].replace(AUTO_TESTID, '');
      if (/\baria-label="Akcja"/.test(next) && /aria-label=/.test(windowLines.replace('aria-label="Akcja"', ''))) {
        next = next.replace(/\saria-label="Akcja"/, '');
      }
      if (next !== lines[lineIndex]) {
        lines[lineIndex] = next;
        changed = true;
        removed += 1;
      }
    }

    if (changed) {
      await fs.writeFile(filePath, lines.join('\n'));
    }
  }

  console.log(`Removed ${removed} duplicate auto-generated data-testid attributes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
