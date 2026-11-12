// Client-side shell gate for Cloud Agents. Not a permission boundary.
// Merge agenta: polityka https://github.com/Prezentytu/baza-wiedzy/blob/main/praca-z-agentami/merge-agenta.md
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PUSH_MAIN = /\bgit\b[\s\S]*\bpush\b[\s\S]*(?:\borigin\/)?(?:HEAD:)?(?:refs\/heads\/)?main\b/;
const GH_MERGE = /\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b/;
const API_MERGE = /\/pulls\/\d+\/merge\b|\bmergePullRequest\b|\benablePullRequestAutoMerge\b|\benqueuePullRequest\b|\brepos\/[^/\s]+\/[^/\s]+\/merges\b/;
const API_WRITE = /(^|\s)((-X|--method)[\s=]*(POST|PUT|PATCH|DELETE)\b|(-f|-F|--field|--raw-field|--input)(\s|=))/i;
const API_GET = /(^|\s)(-X|--method)[\s=]*GET\b/i;
const API_INPUT = /(^|\s)--input(\s|=)/;
const API_SUBSTITUTION = /\bgraphql\b[\s\S]*\bquery=[^\s]*(\$\(|`)/;
// Zapis = metoda zapisu albo pola; jawny GET z -f/-F to odczyt (gh zamienia pola na parametry zapytania).
const isApiWrite = (text) => /(^|\s)(-X|--method)[\s=]*(POST|PUT|PATCH|DELETE)\b/i.test(text) || API_INPUT.test(text) || (API_WRITE.test(text) && !API_GET.test(text));
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
  const at = tokens.findIndex((token, i) => token === "pr" && tokens[i + 1] === "merge");
  if (at < 0) return ["pull request merge: nie umiem odczytać komendy"];
  const denials = [];
  const args = tokens.slice(at + 2);
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

const GH_PR_REVIEW = /^(\S*\/)?gh\s[\s\S]*\bpr\s+review\b/;

export function classifyShellCommand(command, options = {}) {
  const deps = {
    consentDir: options.consentDir ?? path.join(homedir(), ".claude", "merge-zgody"),
    now: options.now ?? Date.now(),
  };
  const raw = String(command ?? "");
  const reasons = [];
  for (const segment of commandSegments(raw)) {
    const bare = skeleton(segment);
    if (PUSH_MAIN.test(segment)) reasons.push("push to main");
    if (API_COMMAND.test(bare) || /\bgh\b[\s\S]*\bapi\b/.test(bare)) {
      if (API_MERGE.test(segment)) reasons.push("pull request merge przez API");
      if (API_MAIN_REF.test(segment) && isApiWrite(segment)) reasons.push("zapis refs/heads/main przez API");
      if (API_GRAPHQL_FILE.test(segment) || API_SUBSTITUTION.test(segment)) reasons.push("GraphQL z pliku, stdin albo podstawienia: podaj zapytanie w -f query=");
      if (reviewApiDenied(segment)) reasons.push("review przez API: przepuszczam tylko jawne event=COMMENT albo REQUEST_CHANGES w argumentach");
    }
    if (GH_MERGE.test(bare)) {
      reasons.push(...(GH_FIRST.test(segment) ? mergeDenials(segment, raw, deps) : ["pull request merge wewnątrz konstrukcji powłoki: wywołaj `gh pr merge` osobno"]));
    }
    if (/\bgh\b[\s\S]*\balias\s+(set|import)\b/.test(bare) && /merge|review|api/.test(segment)) reasons.push("alias gh na merge, review albo api");
    if (GH_PR_REVIEW.test(bare) && approveDenial(segment)) reasons.push("approve robi człowiek");
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
