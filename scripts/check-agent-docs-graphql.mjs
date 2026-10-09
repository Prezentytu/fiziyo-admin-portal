import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OPERATION_NAME = /\b[A-Z][A-Z0-9_]*_(?:QUERY|MUTATION|SUBSCRIPTION|FRAGMENT)\b/g;
const EXPORTED_OPERATION = /export const ([A-Z][A-Z0-9_]*_(?:QUERY|MUTATION|SUBSCRIPTION|FRAGMENT))\b/g;
const SOURCE_FILE = /\.(ts|tsx)$/;

function walk(dir, accept, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, accept, found);
    else if (accept(entry.name)) found.push(full);
  }
  return found;
}

export function collectExportedOperations(root) {
  const names = new Set();
  for (const file of walk(path.join(root, "src"), (name) => SOURCE_FILE.test(name))) {
    for (const match of fs.readFileSync(file, "utf8").matchAll(EXPORTED_OPERATION)) names.add(match[1]);
  }
  return names;
}

export function checkAgentDocsGraphql(root) {
  const exported = collectExportedOperations(root);
  const docs = [path.join(root, "AGENTS.md"), ...walk(path.join(root, "src"), (name) => name === "AGENTS.md")];
  const errors = [];
  for (const doc of docs.filter((file) => fs.existsSync(file))) {
    const lines = fs.readFileSync(doc, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const [name] of line.matchAll(OPERATION_NAME)) {
        if (!exported.has(name)) errors.push(`${path.relative(root, doc)}:${index + 1}: ${name} is not exported from src/`);
      }
    });
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkAgentDocsGraphql(process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("GraphQL operations named in AGENTS.md files exist in src/.");
}
