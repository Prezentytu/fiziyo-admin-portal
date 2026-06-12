import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SOURCE_ROOT = path.join(ROOT_DIR, '.ai/skills');
const TARGET_ROOT = path.join(ROOT_DIR, '.cursor/skills');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifest.json');
const LINT_MODE = process.argv.includes('--lint');

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

function parseFrontmatter(skillContent, skillName) {
  const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error(`Skill "${skillName}" is missing frontmatter.`);
  }

  const frontmatterLines = frontmatterMatch[1].split('\n');
  const frontmatter = {};

  for (const line of frontmatterLines) {
    if (!line.trim()) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter[key] = value;
  }

  if (!frontmatter.name || !frontmatter.description) {
    throw new Error(`Skill "${skillName}" frontmatter requires "name" and "description".`);
  }

  return frontmatter;
}

async function readManifest() {
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid skills manifest format.');
  }

  if (!manifest.tiers || typeof manifest.tiers !== 'object') {
    throw new Error('Skills manifest must include "tiers".');
  }

  const declaredSkills = new Map();
  for (const [tierName, tierSkills] of Object.entries(manifest.tiers)) {
    if (!Array.isArray(tierSkills)) {
      throw new Error(`Tier "${tierName}" must be an array.`);
    }

    for (const skillName of tierSkills) {
      if (typeof skillName !== 'string' || !skillName.trim()) {
        throw new Error(`Tier "${tierName}" contains invalid skill entry.`);
      }
      if (declaredSkills.has(skillName)) {
        throw new Error(`Skill "${skillName}" is duplicated across tiers.`);
      }
      declaredSkills.set(skillName, tierName);
    }
  }

  return { manifest, declaredSkills };
}

async function loadSkillDirectories() {
  const sourceEntries = await fs.readdir(SOURCE_ROOT, { withFileTypes: true });
  return sourceEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function ensureManifestMatchesDirectories(declaredSkills, skillDirectories) {
  const actualSkillSet = new Set(skillDirectories);
  const declaredSkillSet = new Set(declaredSkills.keys());

  const missingInManifest = skillDirectories.filter((skillName) => !declaredSkillSet.has(skillName));
  const missingOnDisk = [...declaredSkillSet].filter((skillName) => !actualSkillSet.has(skillName));

  if (missingInManifest.length || missingOnDisk.length) {
    const details = [
      missingInManifest.length > 0
        ? `Directories not listed in manifest: ${missingInManifest.join(', ')}.`
        : null,
      missingOnDisk.length > 0 ? `Manifest entries missing on disk: ${missingOnDisk.join(', ')}.` : null,
    ]
      .filter(Boolean)
      .join(' ');
    throw new Error(`Skills manifest drift detected. ${details}`);
  }
}

async function validateSkills(declaredSkills) {
  const validationSummary = [];

  for (const [skillName, tierName] of declaredSkills.entries()) {
    const sourceSkillPath = path.join(SOURCE_ROOT, skillName);
    const skillFilePath = path.join(sourceSkillPath, 'SKILL.md');
    if (!(await pathExists(skillFilePath))) {
      throw new Error(`Missing SKILL.md for "${skillName}".`);
    }

    const skillContent = await fs.readFile(skillFilePath, 'utf8');
    const frontmatter = parseFrontmatter(skillContent, skillName);
    validationSummary.push({
      skillName,
      tierName,
      frontmatterName: frontmatter.name,
    });
  }

  return validationSummary;
}

async function main() {
  const { manifest, declaredSkills } = await readManifest();
  const skillDirectories = await loadSkillDirectories();
  ensureManifestMatchesDirectories(declaredSkills, skillDirectories);
  const validationSummary = await validateSkills(declaredSkills);

  if (LINT_MODE) {
    console.log(`skills:lint OK (${validationSummary.length} skills, manifest version ${manifest.version ?? 'n/a'}).`);
    return;
  }

  await fs.rm(TARGET_ROOT, { recursive: true, force: true });
  await fs.mkdir(TARGET_ROOT, { recursive: true });

  let syncedSkills = 0;

  for (const skillDirectory of declaredSkills.keys()) {
    const sourceSkillPath = path.join(SOURCE_ROOT, skillDirectory);
    const skillFilePath = path.join(sourceSkillPath, 'SKILL.md');

    if (!(await pathExists(skillFilePath))) {
      continue;
    }

    const targetSkillPath = path.join(TARGET_ROOT, skillDirectory);
    await copyDirectory(sourceSkillPath, targetSkillPath);
    syncedSkills += 1;
  }

  console.log(
    `Synced ${syncedSkills} skills to .cursor/skills (manifest version ${manifest.version ?? 'n/a'}).`
  );
}

main().catch((error) => {
  console.error('Failed to sync skills.', error);
  process.exit(1);
});
