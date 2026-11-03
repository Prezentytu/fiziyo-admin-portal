// Kontekst agenta: kopie z kanonu fizjo-app mają nagłówek źródła,
// a marker `[egzekwowane: <ścieżka>]` w lessons.md wskazuje istniejący plik.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SHARED_DOCS, parseHeader } from "./sync-shared-docs.mjs";

const MARKER_RE = /\[egzekwowane: ([^\]]+)\]/g;

export function checkSharedDocs(root) {
  const warnings = [];
  const errors = [];
  for (const doc of SHARED_DOCS) {
    const file = path.join(root, doc.local);
    if (!fs.existsSync(file)) {
      errors.push(`${doc.local}: missing copy of fizjo-app ${doc.remote} (npm run docs:sync)`);
      continue;
    }
    const parsed = parseHeader(fs.readFileSync(file, "utf8"));
    if (!parsed) {
      warnings.push(`${doc.local}: no "kopia z Prezentytu/fizjo-app@<sha>" header; local edits may drift from canon ${doc.remote}`);
    } else if (parsed.path !== doc.remote) {
      errors.push(`${doc.local}: header points at ${parsed.path}, expected ${doc.remote}`);
    }
  }
  return { warnings, errors };
}

export function checkLessonMarkers(root, lessonsPath = ".ai/lessons.md") {
  const errors = [];
  const text = fs.readFileSync(path.join(root, lessonsPath), "utf8");
  text.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(MARKER_RE)) {
      for (const entry of match[1].split(",")) {
        const target = entry.trim().split(/\s+/)[0];
        if (target === "<ścieżka>") continue;
        if (!fs.existsSync(path.join(root, target))) {
          errors.push(`${lessonsPath}:${index + 1}: [egzekwowane] points at missing ${target}`);
        }
      }
    }
  });
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const shared = checkSharedDocs(root);
  const errors = [...shared.errors, ...checkLessonMarkers(root)];
  for (const warning of shared.warnings) console.warn(`warning: ${warning}`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Shared docs and lesson markers checked.");
}
