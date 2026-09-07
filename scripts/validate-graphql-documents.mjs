#!/usr/bin/env node
import { parse, validate, buildASTSchema, buildSchema } from "graphql";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCUMENT_GLOBS = process.argv.slice(2);
const SEARCH_ROOTS =
  DOCUMENT_GLOBS.length > 0
    ? DOCUMENT_GLOBS
    : ["src/graphql", "src/features"];
const SCHEMA_CANDIDATES = [
  process.env.GRAPHQL_SCHEMA_PATH,
  "graphql/schema.graphql",
  "backend/schema.graphql",
].filter(Boolean);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "generated") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(ts|tsx|js|jsx|graphql)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function extractDocuments(file) {
  const src = fs.readFileSync(file, "utf8");
  const docs = [];
  if (file.endsWith(".graphql")) {
    docs.push(src);
    return docs;
  }
  const re = /gql\s*`([\s\S]*?)`/g;
  let match;
  while ((match = re.exec(src))) {
    docs.push(match[1]);
  }
  return docs;
}

function loadSchema() {
  for (const relative of SCHEMA_CANDIDATES) {
    const full = path.isAbsolute(relative) ? relative : path.join(ROOT, relative);
    if (fs.existsSync(full)) {
      const sdl = fs.readFileSync(full, "utf8");
      try {
        return { schema: buildSchema(sdl), path: full };
      } catch {
        return { schema: buildASTSchema(parse(sdl)), path: full };
      }
    }
  }
  return null;
}

const files = SEARCH_ROOTS.flatMap((root) => walk(path.join(ROOT, root)));
let parsed = 0;
const errors = [];

for (const file of files) {
  for (const document of extractDocuments(file)) {
    const trimmed = document.trim();
    if (!trimmed || trimmed.includes("${")) {
      continue;
    }
    try {
      parse(trimmed);
      parsed += 1;
    } catch (error) {
      errors.push(`${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
}

if (parsed === 0) {
  console.error("Nie znaleziono dokumentów GraphQL (gql`...`).");
  process.exit(1);
}

const loaded = loadSchema();
if (!loaded) {
  console.log(`OK: ${parsed} dokumentów GraphQL (składnia). Brak schema.graphql — pomijam walidację pól.`);
  process.exit(errors.length > 0 ? 1 : 0);
}

for (const file of files) {
  for (const document of extractDocuments(file)) {
    const trimmed = document.trim();
    if (!trimmed || trimmed.includes("${")) {
      continue;
    }
    try {
      const ast = parse(trimmed);
      const issues = validate(loaded.schema, ast);
      for (const issue of issues) {
        errors.push(`${path.relative(ROOT, file)}: ${issue.message}`);
      }
    } catch (error) {
      errors.push(`${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`GraphQL contract failed (${errors.length}):`);
  for (const error of errors.slice(0, 50)) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log(`OK: ${parsed} dokumentów GraphQL zgodnych z ${path.relative(ROOT, loaded.path)}`);
