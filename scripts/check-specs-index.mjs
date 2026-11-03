import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["spec", "repo", "issues", "prs"];

export const STATUSES = ["draft", "approved", "in-progress", "implemented", "verified", "deprecated"];
export const LEGACY_STATUS = "Aktywny";

// Wiersze, które 2026-10-29 zostały na `Aktywny`, bo plik speca nie dowodzi statusu.
// Przy edycji speca nadaj status ze słownika i usuń numer stąd. Pusta lista = `Aktywny` zawsze błędem.
export const LEGACY_AKTYWNY = ["007", "008", "009", "010", "011", "013", "015", "016"];

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

export function parseIndexRows(readme) {
  const start = readme.indexOf("## Indeks specyfikacji");
  if (start === -1) return [];
  const rest = readme.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const section = end === -1 ? rest : rest.slice(0, end);
  const rows = [];
  for (const line of section.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 4 || !/^\d{3}$/.test(cells[1])) continue;
    rows.push({ number: cells[1], status: cells[cells.length - 2] });
  }
  return rows;
}

export function checkSpecsIndex(root, { legacyAktywny = LEGACY_AKTYWNY } = {}) {
  const specsDir = path.join(root, ".ai/specs");
  const readme = fs.readFileSync(path.join(specsDir, "README.md"), "utf8");
  const errors = [];
  const warnings = [];
  const files = fs.readdirSync(specsDir).filter((name) => /^SPEC-\d{3}-.+\.md$/.test(name));
  const rows = parseIndexRows(readme);
  const indexed = new Set(rows.map((row) => row.number));
  const numbers = new Set(files.map((name) => name.slice(5, 8)));

  for (const name of files) {
    const spec = name.slice(0, 8);
    if (!indexed.has(spec.slice(5))) errors.push(`Missing index row for ${spec}`);
    const fields = parseFrontmatter(fs.readFileSync(path.join(specsDir, name), "utf8"));
    if (!fields) {
      errors.push(`${name}: missing YAML frontmatter`);
      continue;
    }
    for (const key of REQUIRED) if (!(key in fields)) errors.push(`${name}: missing frontmatter field ${key}`);
    if (fields.spec && fields.spec !== spec) errors.push(`${name}: spec ${fields.spec} does not match filename`);
  }

  const legacy = [];
  for (const row of rows) {
    if (!numbers.has(row.number)) errors.push(`Index row ${row.number} has no SPEC-${row.number}-*.md file`);
    if (row.status === LEGACY_STATUS) {
      if (legacyAktywny.includes(row.number)) legacy.push(row.number);
      else errors.push(`Index row ${row.number}: status Aktywny is legacy; use ${STATUSES.join("/")}`);
    } else if (!STATUSES.includes(row.status)) {
      errors.push(`Index row ${row.number}: unknown status "${row.status}"; use ${STATUSES.join("/")}`);
    }
  }
  if (legacy.length) {
    warnings.push(`${legacy.length} spec(s) still on legacy status Aktywny: ${legacy.join(", ")}; set a real status when you touch the spec`);
  }
  return { errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = checkSpecsIndex(process.cwd());
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Spec index, statuses and frontmatter present.");
}
