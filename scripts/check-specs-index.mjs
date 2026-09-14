import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["spec", "repo", "issues", "prs", "board"];

export function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fields = {};
  for (const line of text.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

export function checkSpecsIndex(root) {
  const specsDir = path.join(root, ".ai/specs");
  const readme = fs.readFileSync(path.join(specsDir, "README.md"), "utf8");
  const errors = [];
  const files = fs.readdirSync(specsDir).filter((name) => /^SPEC-\d{3}-.+\.md$/.test(name));
  for (const name of files) {
    const spec = name.slice(0, 8);
    const number = spec.slice(5);
    if (!new RegExp(`\\|\\s*${number}\\s*\\|`).test(readme)) errors.push(`Missing index row for ${spec}`);
    const fields = parseFrontmatter(fs.readFileSync(path.join(specsDir, name), "utf8"));
    if (!fields) {
      errors.push(`${name}: missing YAML frontmatter`);
      continue;
    }
    for (const key of REQUIRED) if (!(key in fields)) errors.push(`${name}: missing frontmatter field ${key}`);
    if (fields.spec && fields.spec !== spec) errors.push(`${name}: spec ${fields.spec} does not match filename`);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkSpecsIndex(process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Spec index and frontmatter present.");
}
