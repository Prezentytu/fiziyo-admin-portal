import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SOURCE_ROOT = path.join(ROOT_DIR, '.ai/skills');
const TARGET_ROOTS = ['.cursor/skills', '.agents/skills'].map((dir) => path.join(ROOT_DIR, dir));
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifest.json');
const LINT_MODE = process.argv.includes('--lint');
const CHECK_MODE = process.argv.includes('--check');

async function statOrMissing(targetPath) {
  try {
    return await fs.lstat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function assertDirectory(targetPath) {
  const stat = await statOrMissing(targetPath);
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
    throw new Error(`Expected a real directory: ${targetPath}`);
  }
  return stat;
}

// Inventory first: no destination is changed until all mirrors pass preflight.
async function inventory(root, relative = '', entries = new Map()) {
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
      throw new Error(`Unsupported file or symlink: ${path.join(root, name)}`);
    }
    entries.set(name, entry.isDirectory() ? null : await fs.readFile(path.join(root, name)));
    if (entry.isDirectory()) await inventory(root, name, entries);
  }
  return entries;
}

async function preflight(targetRoot, sourceEntries) {
  await assertDirectory(path.dirname(targetRoot));
  const exists = await assertDirectory(targetRoot);
  if (!exists && CHECK_MODE) throw new Error(`Missing mirror: ${targetRoot}`);
  const targetEntries = exists ? await inventory(targetRoot) : new Map();
  for (const [name, content] of targetEntries) {
    if (!sourceEntries.has(name)) {
      throw new Error(`Extra mirror entry; left intact: ${path.join(targetRoot, name)}`);
    }
    if ((content === null) !== (sourceEntries.get(name) === null)) {
      throw new Error(`File/directory conflict: ${path.join(targetRoot, name)}`);
    }
  }
  if (CHECK_MODE) {
    for (const [name, content] of sourceEntries) {
      if (!targetEntries.has(name) || (content !== null && !content.equals(targetEntries.get(name)))) {
        throw new Error(`Mirror drift: ${path.join(targetRoot, name)}`);
      }
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
      if (typeof skillName !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(skillName)) {
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
  if (sourceEntries.some((entry) => entry.isSymbolicLink())) {
    throw new Error('Source skills root contains a symlink.');
  }
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
    if (!(await statOrMissing(skillFilePath))?.isFile()) {
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
  if (LINT_MODE && CHECK_MODE) throw new Error('Use --lint or --check, not both.');
  await assertDirectory(path.dirname(SOURCE_ROOT));
  await assertDirectory(SOURCE_ROOT);
  const manifestStat = await statOrMissing(MANIFEST_PATH);
  if (!manifestStat?.isFile()) throw new Error('Manifest must be a real file.');
  const { manifest, declaredSkills } = await readManifest();
  const skillDirectories = await loadSkillDirectories();
  ensureManifestMatchesDirectories(declaredSkills, skillDirectories);
  const sourceEntries = new Map();
  for (const skillName of declaredSkills.keys()) {
    sourceEntries.set(skillName, null);
    await inventory(SOURCE_ROOT, skillName, sourceEntries);
  }
  const validationSummary = await validateSkills(declaredSkills);

  if (LINT_MODE) {
    console.log(`skills:lint OK (${validationSummary.length} skills, manifest version ${manifest.version ?? 'n/a'}).`);
    return;
  }

  for (const targetRoot of TARGET_ROOTS) await preflight(targetRoot, sourceEntries);
  if (CHECK_MODE) {
    console.log(`skills:check OK (${validationSummary.length} skills, both mirrors match).`);
    return;
  }

  // OS errors or concurrent edits can still interrupt this copy; it is not atomic.
  for (const targetRoot of TARGET_ROOTS) {
    await fs.mkdir(targetRoot, { recursive: true });
    for (const [name, content] of sourceEntries) {
      const targetPath = path.join(targetRoot, name);
      if (content === null) await fs.mkdir(targetPath, { recursive: true });
      else await fs.writeFile(targetPath, content);
    }
  }
  console.log(`Synced ${validationSummary.length} skills to .cursor/skills and .agents/skills (manifest version ${manifest.version ?? 'n/a'}).`);
}

main().catch((error) => {
  console.error('Failed to sync skills.', error);
  process.exit(1);
});
