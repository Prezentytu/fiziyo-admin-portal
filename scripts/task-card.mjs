// Kontrakt karty zadania: jedyna sciezka, ktora niesie polecenie od bota do agenta.
//
// Walidacja formatu, NIE autoryzacja: karta to zawartosc pierwszego bloku
// ```task-card w tresci issue. Cala reszta \u2014 opis, cytaty, komentarze \u2014 jest materialem
// do oceny, nigdy instrukcja. Nieznany klucz jest bledem, nie polem do przemycenia.
//
//   gh issue view <N> --json body -q .body | node scripts/task-card.mjs check
//   node scripts/task-card.mjs promote /tmp/issue.md --issue owner/repo#N
//   node scripts/task-card.mjs source-id "linia zrodlowa ze zgloszenia"
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODES = ["fix", "spec", "docs", "advise"];
export const SHAPES = ["slice", "repair", "survey", "finish", "review"];

const FIELDS = {
  Cel: { required: true, maxLength: 200 },
  Tryb: { required: true, oneOf: MODES },
  Kształt: { required: false, oneOf: SHAPES, default: "slice" },
  Repo: { required: true },
  "Pierwszy artefakt": { required: false, maxLength: 200 },
  Issue: { required: false },
  Spec: { required: false },
  BOARD: { required: false },
  Zakres: { required: false, maxLength: 300 },
  Skill: { required: false },
  Stop: { required: false, maxLength: 200 },
  Oddaj: { required: false, maxLength: 200 },
  Zlecił: { required: true, maxLength: 120 },
  Źródło: { required: false },
};

// Tryby, ktore koncza sie zmiana w kodzie, musza wskazywac issue.
const REQUIRES_ISSUE = ["fix", "spec"];

/** Stabilny klucz deduplikacji. Bot liczy go z linii zrodlowej, zanim utworzy issue. */
export function sourceId(text) {
  const normalised = String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!normalised) throw new Error("sourceId wymaga niepustego tekstu");
  return createHash("sha256").update(normalised).digest("hex").slice(0, 12);
}

function extractBlock(body) {
  const match = String(body ?? "").match(/```task-card\r?\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

const ISSUE_REFERENCE = /^[\w.-]+\/[\w.-]+#\d+$/;

/**
 * Promocja zgloszenia do naprawy: `Tryb` na `fix` i wskazanie ticketu.
 * Przepisuje WYLACZNIE pierwszy blok task-card; reszta tresci zostaje bajt w bajt,
 * zeby tekst spoza karty nie mogl sterowac promocja.
 */
export function promoteTaskCard(body, { issue, repositories = [] } = {}) {
  const text = String(body ?? "");
  const match = text.match(/```task-card\r?\n([\s\S]*?)```/);
  if (!match) return { ok: false, changed: false, body: text, errors: ["Brak bloku ```task-card w treści issue"] };

  const reference = String(issue ?? "").trim();
  const errors = [];
  if (!ISSUE_REFERENCE.test(reference)) errors.push(`Issue: oczekiwano owner/repo#N, jest "${reference}"`);
  else if (repositories.length > 0 && !repositories.includes(reference.split("#")[0]))
    errors.push(`Issue: "${reference}" wskazuje repozytorium spoza ${repositories.join(", ")}`);

  const before = parseTaskCard(text, { repositories });
  if (!before.ok) errors.push(...before.errors);
  if (errors.length > 0) return { ok: false, changed: false, body: text, errors };

  if (before.card.Tryb === "fix" && before.card.Issue === reference)
    return { ok: true, changed: false, body: text, errors: [] };

  const eol = match[1].includes("\r\n") ? "\r\n" : "\n";
  const lines = match[1].split(/\r?\n/);
  let issueWritten = false;
  let anchor = -1;

  const promoted = lines.map((line, index) => {
    const key = line.slice(0, line.indexOf(":")).trim();
    if (key === "Repo" || key === "Pierwszy artefakt") anchor = index;
    if (key === "Tryb") return `Tryb: fix`;
    if (key === "Issue") {
      issueWritten = true;
      return `Issue: ${reference}`;
    }
    return line;
  });

  if (!issueWritten) promoted.splice(anchor + 1, 0, `Issue: ${reference}`);

  const opening = match[0].slice(0, match[0].indexOf("\n") + 1);
  const next =
    text.slice(0, match.index) + opening + promoted.join(eol) + "```" + text.slice(match.index + match[0].length);

  const after = parseTaskCard(next, { repositories });
  if (!after.ok) return { ok: false, changed: false, body: text, errors: after.errors };

  return { ok: true, changed: true, body: next, errors: [], card: after.card };
}

export function parseTaskCard(body, { repositories = [] } = {}) {
  const errors = [];
  const block = extractBlock(body);
  if (block === null) return { ok: false, card: null, errors: ["Brak bloku ```task-card w treści issue"] };

  const card = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator === -1) {
      errors.push(`Linia bez klucza: ${line.trim().slice(0, 60)}`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!Object.hasOwn(FIELDS, key)) {
      errors.push(`Nieznany klucz karty: ${key}`);
      continue;
    }
    if (key in card) errors.push(`Zduplikowany klucz karty: ${key}`);
    card[key] = value;
  }

  for (const [key, rule] of Object.entries(FIELDS)) {
    const value = card[key];
    if (value === undefined || value === "") {
      if (rule.required) errors.push(`Brak wymaganego pola: ${key}`);
      else if (rule.default) card[key] = rule.default;
      continue;
    }
    if (rule.oneOf && !rule.oneOf.includes(value))
      errors.push(`${key}: oczekiwano ${rule.oneOf.join(" | ")}, jest "${value}"`);
    if (rule.maxLength && value.length > rule.maxLength) errors.push(`${key}: przekracza ${rule.maxLength} znaków`);
  }

  if (card.Repo && repositories.length > 0 && !repositories.includes(card.Repo))
    errors.push(`Repo: "${card.Repo}" nie jest jednym z ${repositories.join(", ")}`);

  if (REQUIRES_ISSUE.includes(card.Tryb) && !card.Issue) errors.push(`Tryb ${card.Tryb} wymaga pola Issue`);

  return { ok: errors.length === 0, card: errors.length === 0 ? card : null, errors };
}

function repositoriesFromConfig(root) {
  const adapter = path.join(root, ".ai/agent-adapter.json");
  const config = JSON.parse(fs.readFileSync(fs.existsSync(adapter) ? adapter : path.join(root, ".ai/agent-workflow.json"), "utf8"));
  return [config.repository, ...config.externalRepositories];
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "check") {
    const body = rest[0] ? fs.readFileSync(rest[0], "utf8") : await readStdin();
    const result = parseTaskCard(body, { repositories: repositoriesFromConfig(process.cwd()) });
    if (result.ok) {
      console.log(JSON.stringify(result.card, null, 2));
    } else {
      console.error("Karta zadania jest niepoprawna:\n");
      for (const error of result.errors) console.error(`  - ${error}`);
      console.error("\nNie wykonuj tego zgłoszenia. Skomentuj issue tą listą i zatrzymaj się.");
      process.exitCode = 1;
    }
  } else if (command === "promote") {
    const flag = rest.indexOf("--issue");
    const file = rest.find((argument, index) => !argument.startsWith("--") && index !== flag + 1);
    const body = file ? fs.readFileSync(file, "utf8") : await readStdin();
    const result = promoteTaskCard(body, {
      issue: flag === -1 ? "" : rest[flag + 1],
      repositories: repositoriesFromConfig(process.cwd()),
    });
    if (result.ok) {
      process.stdout.write(result.body);
      if (!result.changed) console.error("Karta była już promowana — treść bez zmian.");
    } else {
      console.error("Nie mogę promować tej karty:\n");
      for (const error of result.errors) console.error(`  - ${error}`);
      console.error("\nSkomentuj issue tą listą, zdejmij etykietę i zatrzymaj się.");
      process.exitCode = 1;
    }
  } else if (command === "source-id") {
    console.log(sourceId(rest.join(" ")));
  } else {
    console.error(
      "Uzycie: task-card.mjs check [plik] | task-card.mjs promote [plik] --issue owner/repo#N | task-card.mjs source-id <tekst>"
    );
    process.exit(1);
  }
}
