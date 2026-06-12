import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SOURCE_ROOT = path.join(ROOT_DIR, '.ai/skills');
const TARGET_ROOT = path.join(ROOT_DIR, '.cursor/skills');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(sourcePath, targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const targetEntryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourceEntryPath, targetEntryPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourceEntryPath, targetEntryPath);
    }
  }
}

async function main() {
  const sourceEntries = await fs.readdir(SOURCE_ROOT, { withFileTypes: true });
  const skillDirectories = sourceEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  await fs.rm(TARGET_ROOT, { recursive: true, force: true });
  await fs.mkdir(TARGET_ROOT, { recursive: true });

  let syncedSkills = 0;

  for (const skillDirectory of skillDirectories) {
    const sourceSkillPath = path.join(SOURCE_ROOT, skillDirectory);
    const skillFilePath = path.join(sourceSkillPath, 'SKILL.md');

    if (!(await pathExists(skillFilePath))) {
      continue;
    }

    const targetSkillPath = path.join(TARGET_ROOT, skillDirectory);
    await copyDirectory(sourceSkillPath, targetSkillPath);
    syncedSkills += 1;
  }

  console.log(`Synced ${syncedSkills} skills to .cursor/skills.`);
}

main().catch((error) => {
  console.error('Failed to sync skills.', error);
  process.exit(1);
});
