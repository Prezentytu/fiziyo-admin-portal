import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');
const FORBIDDEN = [/dawkowanie/i, /program ćwiczeń/i, /podopieczny/i];
const SKIP = ['.test.', '__tests__', 'AGENTS.md'];

function collectSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    if (!/\.(tsx|ts)$/.test(entry.name)) {
      return [];
    }
    if (SKIP.some((part) => fullPath.includes(part))) {
      return [];
    }
    return [fullPath];
  });
}

describe('forbidden therapist copy', () => {
  it('does not use forbidden UI words', () => {
    const violations: string[] = [];

    for (const filePath of collectSourceFiles(ROOT)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      for (const pattern of FORBIDDEN) {
        if (pattern.test(content)) {
          violations.push(`${relativePath} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
