// Client-side shell gate for Cloud Agents. Not a permission boundary.
// Merge agenta: polityka https://github.com/Prezentytu/baza-wiedzy/blob/main/praca-z-agentami/merge-agenta.md
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PUSH_MAIN = /\bgit\b[\s\S]*\bpush\b[\s\S]*(?:\borigin\/)?(?:HEAD:)?(?:refs\/heads\/)?main\b/;
const GH_MERGE = /\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b/;
const API_MERGE = /\/pulls\/\d+\/merge\b|\bmergePullRequest\b|\benablePullRequestAutoMerge\b|\benqueuePullRequest\b|\brepos\/[^/\s]+\/[^/\s]+\/merges\b/;
const API_SUBSTITUTION = /\bgraphql\b[\s\S]*\bquery=[^\s]*(\$\(|`)/;
// Metoda ze słów polecenia (gh bierze ostatnie -X/--method), nie z tekstu argumentów.
function apiMethod(text) {
  let method;
  const words = tokenize(text);
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if ((w === "-X" || w === "--method") && i + 1 < words.length) method = words[i + 1];
    else if (w.startsWith("--method=")) method = w.slice(9);
    else if (w.startsWith("-X") && w.length > 2) method = w.slice(2);
  }
  return method?.toUpperCase();
}

// Zapis = metoda zapisu, --input albo pola bez jawnego GET (gh zamienia pola GET na parametry zapytania).
function isApiWrite(text) {
  const words = tokenize(text);
  const method = apiMethod(text);
  if (method && method !== "GET") return true;
  if (words.some((w) => w === "--input" || w.startsWith("--input="))) return true;
  const fields = words.some((w) => /^(-[fF].*|--field(=.*)?|--raw-field(=.*)?)$/.test(w));
  return fields && method !== "GET";
}
const API_MAIN_REF = /\bgit\/refs\/heads\/(main|master)\b/;
// GraphQL z pliku albo stdin: strażnik nie widzi, czy to merge albo approve.
const API_GRAPHQL_FILE = /\bgraphql\b[\s\S]*((^|\s)(-f|-F|--field|--raw-field)[\s=]*query=@|(^|\s)--input(\s|=))/;
// gh musi być pierwszym słowem segmentu; `do gh`, `exec gh`, `xargs gh`, `( gh`, `$(gh`, `\\gh`, `"gh"` to konstrukcje powłoki.
const GH_FIRST = /^(\S*\/)?gh\s/;
const VERCEL_PROD = /\bvercel\b[\s\S]*--prod\b/;
const PROMOTE = /\b(?:npm|pnpm|yarn|npx|gh)\b[\s\S]*\bpromote\b|\bworkflow[\s\S]*promote|\bpromote(?:\.yml|\.yaml)\b/;

const CONSENT_MAX_AGE_MS = 30 * 60_000;
const CONSENT_MAX_FUTURE_MS = 60_000;
// Flagi `gh pr merge`, które biorą wartość; bez tej listy wartość pomyliłaby się z numerem PR.
const VALUE_FLAGS = new Set(["-R", "--repo", "--match-head-commit", "-b", "--body", "-F", "--body-file", "-t", "--subject", "-A", "--author-email"]);

// Podział na polecenia poza cudzysłowami (&&, ||, ;, |, nowa linia); tekst w cudzysłowie to dane.
function commandSegments(command) {
  const text = String(command ?? "");
  const segments = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\" && quote !== "'" && i + 1 < text.length) {
      current += ch + text[(i += 1)];
    } else if (quote) {
      if (ch === quote) quote = null;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ";" || ch === "|" || ch === "&" || ch === "\n") {
      if ((ch === "&" || ch === "|") && text[i + 1] === ch) i += 1;
      segments.push(current);
      current = "";
    } else current += ch;
  }
  segments.push(current);
  return segments.map((segment) => segment.replace(/\s+/g, " ").trim()).filter(Boolean);
}

// Słowa jak w powłoce: sklejone fragmenty w cudzysłowach (-m"x", --body="x y"), \" w środku to znak.
function tokenize(segment) {
  const tokens = [];
  let word = null;
  let quote = null;
  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i];
    if (ch === "\\" && quote !== "'" && i + 1 < segment.length) word = (word ?? "") + segment[(i += 1)];
    else if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      word ??= "";
    } else if (/\s/.test(ch)) {
      if (word !== null) tokens.push(word);
      word = null;
    } else word = (word ?? "") + ch;
  }
  if (word !== null) tokens.push(word);
  return tokens;
}

// Polecenie bez tekstu w cudzysłowach. Zostaje treść podstawień ($( ) i backtick w "…") oraz cudzysłowione samo `gh`.
function skeleton(segment) {
  let out = "";
  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i];
    if (ch === "\\" && i + 1 < segment.length) {
      out += ch + segment[(i += 1)];
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      let inner = "";
      for (; j < segment.length && segment[j] !== ch; j += 1) {
        if (segment[j] === "\\" && ch === '"' && j + 1 < segment.length) j += 1;
        inner += segment[j];
      }
      i = j;
      out += ch === '"' && /\$\(|`/.test(inner) ? ` ${inner} ` : /^(\S*\/)?gh$/.test(inner) ? ` ${inner} ` : " ";
    } else out += ch;
  }
  return out;
}

const API_COMMAND = /(^|[\s$(`])((\S*\/)?gh\s+(\S+\s+)*?api|curl)\b/;

// Repo tylko jawnie (-R/--repo): origin, cwd i GH_REPO bywają innym repo niż to, które gh zmerguje.
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

function consentExists({ repo, number, sha }, { consentDir, now }) {
  try {
    const age = now - statSync(path.join(consentDir, ...repo.split("/"), `${number}__${sha}`)).mtimeMs;
    return age < CONSENT_MAX_AGE_MS && age > -CONSENT_MAX_FUTURE_MS;
  } catch {
    return false;
  }
}

// Zwraca listę powodów blokady; pusta lista = merge dopuszczony (warunki z polityki merge'a agenta).
function mergeDenials(segment, command, deps) {
  if (/(^|\s)GH_(REPO|HOST)=/.test(command)) return ["pull request merge: GH_REPO/GH_HOST w poleceniu, repo podaj jawnie przez -R"];
  const tokens = tokenize(segment);
  // Forma kanoniczna: `gh pr merge …` zaraz po gh (ship.mjs podaje tylko ją); każda inna, także z flagą przed `pr merge`, to odmowa.
  if (!/^(\S*\/)?gh pr merge(\s|$)/.test(segment)) return ["pull request merge: tylko forma `gh pr merge <N> -R owner/repo --match-head-commit <sha>`, flagi po `merge`"];
  const args = tokens.slice(3);
  const denials = [];
  let sha;
  let repo;
  let number;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (flag === "--admin") denials.push("pull request merge: --admin jest zabroniony");
    else if (flag === "--auto") denials.push("pull request merge: --auto jest zabroniony");
    else if (VALUE_FLAGS.has(flag)) {
      const value = inline ?? args[(i += 1)];
      if (flag === "--match-head-commit") sha = value;
      if (flag === "--repo") repo = value;
      if (flag === "-R") repo = value;
    } else if (arg.startsWith("-R=")) repo = arg.slice(3);
    else if (/^-R./.test(arg)) repo = arg.slice(2);
    else if (!arg.startsWith("-") && number === undefined) number = arg;
  }
  if (!/^\d+$/.test(number ?? "")) denials.push("pull request merge: podaj numer PR (bez URL-a)");
  if (!/^[0-9a-fA-F]{40}$/.test(sha ?? "")) denials.push("pull request merge: wymaga --match-head-commit <40 hex> (bez podstawień powłoki)");
  if (!REPO_NAME.test(repo ?? "")) denials.push("pull request merge: wymaga jawnego -R owner/repo");
  if (denials.length) return denials;
  repo = repo.toLowerCase();
  sha = sha.toLowerCase();
  if (!consentExists({ repo, number, sha }, deps)) {
    return [`pull request merge: brak świeżej zgody ${repo}/${number}__${sha.slice(0, 7)}… w ${deps.consentDir} (ship.mjs, do 30 min)`];
  }
  return [];
}

// Agent działa z tokenu człowieka: approve z jego konta podrobiłby zgodę na drzwi jednokierunkowe.
function approveDenial(segment) {
  const tokens = tokenize(segment);
  return tokens.some((t) => t === "--approve" || t.startsWith("--approve=") || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(t));
}

// Fail-closed: review przez API (REST pulls/N/reviews, GraphQL add/submitPullRequestReview) przechodzi tylko, gdy w samej
// komendzie widać każde `event` i każde jest COMMENT albo REQUEST_CHANGES; --input, plik/stdin i brak event = odmowa.
const REVIEW_API = /\/pulls\/\d+\/reviews\b|\baddPullRequestReview\b|\bsubmitPullRequestReview\b/;
const SAFE_EVENTS = new Set(["COMMENT", "REQUEST_CHANGES"]);

function reviewApiDenied(raw) {
  if (!REVIEW_API.test(raw)) return false;
  if (!/\bgraphql\b/.test(raw) && !isApiWrite(raw)) return false;
  if (/APPROVE\b/i.test(raw) || /(^|\s)--input\b/.test(raw) || /=@/.test(raw)) return true;
  const events = [...raw.matchAll(/\bevent["']?\s*[=:]\s*["']?([A-Za-z_]+)/gi)].map((m) => m[1].toUpperCase());
  return events.length === 0 || !events.every((event) => SAFE_EVENTS.has(event));
}

// Ogranicznik heredoca to całe słowo powłoki: sklejone części w cudzysłowach i bez (`<<'E'OF` to EOF w cudzysłowie).
function heredocStart(line) {
  const match = /(?<!<)<<(?!<)-?[ \t]*((?:'[^']*'|"[^"]*"|\\.|[^\s'"\\;&|<>()])+)/.exec(line);
  if (!match) return null;
  let word = "";
  let quoted = false;
  for (const part of match[1].matchAll(/'([^']*)'|"([^"]*)"|\\(.)|([^'"\\]+)/g)) {
    if (part[4] === undefined) quoted = true;
    word += part[1] ?? part[2] ?? part[3] ?? part[4];
  }
  return { word, quoted };
}

// Treść heredoców to dane (cat <<EOF); podstawienia w niej łapie wcześniejsze skanowanie surowego polecenia.
function stripHeredocs(text, onlyQuoted = false) {
  const kept = [];
  let delimiter = null;
  for (const line of text.split("\n")) {
    if (delimiter) {
      if (line.trim() === delimiter) delimiter = null;
      continue;
    }
    kept.push(line);
    const start = heredocStart(line);
    if (start && (!onlyQuoted || start.quoted)) delimiter = start.word;
  }
  return kept.join("\n");
}

// Kontynuacja linii jak w powłoce: `\\⏎` przy nieparzystej liczbie końcowych ukośników skleja linie, ale nie w treści
// heredoca z ogranicznikiem w cudzysłowie (tam powłoka niczego nie skleja, a ogranicznik musi zostać osobną linią).
function joinContinuations(text) {
  const out = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    i += 1;
    while (/(?<!\\)(?:\\\\)*\\$/.test(line) && i < lines.length) {
      line = `${line.slice(0, -1)} ${lines[i]}`;
      i += 1;
    }
    out.push(line);
    const start = heredocStart(line);
    if (start?.quoted) {
      while (i < lines.length) {
        out.push(lines[i]);
        i += 1;
        if (out.at(-1).trim() === start.word) break;
      }
    }
  }
  return out.join("\n");
}

// Zagnieżdżone gh: $(gh …) i `gh …` w całym surowym poleceniu, bez modelowania cudzysłowów (każdy model coś gubił).
const NESTED_GH = /(?:\$\(|`)\s*((?:\S*\/)?gh\s[^)`]*)/g;

const GH_COMMANDS = new Set(["pr", "api", "alias", "issue", "repo", "run", "workflow", "release", "search", "gist", "label", "secret", "variable", "auth", "browse", "cache", "codespace", "project", "ruleset", "status", "extension", "config"]);
const PR_SUBCOMMANDS = new Set(["merge", "review", "view", "list", "create", "checks", "edit", "comment", "diff", "status", "close", "reopen", "ready", "checkout", "lock", "unlock", "revert", "update-branch", "ls", "new", "co"]);

// (komenda, podkomenda) ze słów bez cudzysłowów: pierwsza znana komenda gh, a po `pr` pierwsza znana podkomenda.
// Flaga z wartością przed nimi ani cudzysłów wokół słowa nie zmieniają wyniku; `gh pr list --search merge` to list.
function ghSubcommand(segment) {
  const words = tokenize(segment);
  if (!words.length || !/^(\S*\/)?gh$/.test(words[0])) return [null, null];
  // Flaga zaraz po gh: nie wiemy, czy bierze wartość, więc słowo merge/review/api/alias w poleceniu to odmowa.
  if (words[1]?.startsWith("-") && words.some((w) => ["merge", "review", "api", "alias"].includes(w))) return ["flag-first", null];
  for (let i = 1; i < words.length; i += 1) {
    if (!GH_COMMANDS.has(words[i])) continue;
    const rest = words.slice(i + 1);
    if (words[i] === "pr") return ["pr", rest.find((w) => PR_SUBCOMMANDS.has(w)) ?? null];
    if (words[i] === "alias") return ["alias", rest.find((w) => !w.startsWith("-")) ?? null];
    return [words[i], null];
  }
  return [null, null];
}

const GH_PR_REVIEW = /^(\S*\/)?gh\s[\s\S]*\bpr\b[\s\S]*\breview\b/;

export function classifyShellCommand(command, options = {}) {
  const deps = {
    consentDir: options.consentDir ?? path.join(homedir(), ".claude", "merge-zgody"),
    now: options.now ?? Date.now(),
  };
  const raw = joinContinuations(String(command ?? ""));
  const reasons = [];
  for (const match of stripHeredocs(raw, true).matchAll(NESTED_GH)) {
    const inner = match[1];
    if (GH_MERGE.test(inner)) reasons.push("pull request merge wewnątrz $( ) albo backtickach: wywołaj `gh pr merge` osobno");
    else reasons.push(...classifyShellCommand(inner, options).reasons);
  }
  for (const segment of commandSegments(stripHeredocs(raw))) {
    const bare = skeleton(segment);
    const [ghCommand, ghSub] = ghSubcommand(segment);
    const ghFirst = GH_FIRST.test(segment);
    if (ghCommand === "flag-first") reasons.push("gh z flagą przed komendą i słowem merge, review, api albo alias: podaj komendę zaraz po gh");
    if (PUSH_MAIN.test(segment)) reasons.push("push to main");
    if (ghCommand === "api" || (!ghFirst && (API_COMMAND.test(bare) || /\bgh\b[\s\S]*\bapi\b/.test(bare)))) {
      if (API_MERGE.test(segment)) reasons.push("pull request merge przez API");
      if (API_MAIN_REF.test(segment) && isApiWrite(segment)) reasons.push("zapis refs/heads/main przez API");
      if (API_GRAPHQL_FILE.test(segment) || API_SUBSTITUTION.test(segment)) reasons.push("GraphQL z pliku, stdin albo podstawienia: podaj zapytanie w -f query=");
      if (reviewApiDenied(segment)) reasons.push("review przez API: przepuszczam tylko jawne event=COMMENT albo REQUEST_CHANGES w argumentach");
    }
    if (ghFirst && ghCommand === "pr" && ghSub === "merge") reasons.push(...mergeDenials(segment, raw, deps));
    else if (!ghFirst && GH_MERGE.test(bare)) reasons.push("pull request merge wewnątrz konstrukcji powłoki: wywołaj `gh pr merge` osobno");
    if (((ghCommand === "alias" && (ghSub === "set" || ghSub === "import")) || (!ghFirst && /\bgh\b[\s\S]*\balias\s+(set|import)\b/.test(bare))) && /merge|review|api/.test(segment)) reasons.push("alias gh na merge, review albo api");
    if (((ghCommand === "pr" && ghSub === "review") || (!ghFirst && GH_PR_REVIEW.test(bare))) && approveDenial(segment)) reasons.push("approve robi człowiek");
    if (VERCEL_PROD.test(segment)) reasons.push("production deploy");
    if (PROMOTE.test(segment)) reasons.push("promote workflow");
  }
  return reasons.length ? { permission: "deny", reasons: [...new Set(reasons)] } : { permission: "allow", reasons: [] };
}

export function hookResponse(command, options) {
  const result = classifyShellCommand(command, options);
  if (result.permission === "deny") {
    return {
      permission: "deny",
      agent_message: `Blocked: ${result.reasons.join("; ")}. Client hook only, not a permission boundary.`,
      user_message: `Command blocked by agent-guard: ${result.reasons.join("; ")}`,
    };
  }
  return { permission: "allow" };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argvCommand = process.argv.slice(2).join(" ").trim();
  let command = argvCommand;
  if (!command) {
    // Cursor: { command }; Claude Code: { tool_input: { command } }.
    const payload = JSON.parse((await readStdin()) || "{}");
    command = payload.command ?? payload.tool_input?.command ?? "";
  }
  const response = hookResponse(command);
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.permission === "deny") process.exitCode = 2;
}
