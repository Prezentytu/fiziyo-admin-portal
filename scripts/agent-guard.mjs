// Client-side shell gate for Cloud Agents. Not a permission boundary.
// Merge agenta: polityka https://github.com/Prezentytu/baza-wiedzy/blob/main/praca-z-agentami/merge-agenta.md
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PUSH_MAIN = /\bgit\b[\s\S]*\bpush\b[\s\S]*(?:\borigin\/)?(?:HEAD:)?(?:refs\/heads\/)?main\b/;
const GH_MERGE = /\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b/;
const API_MERGE = /\/pulls\/\d+\/merge\b|\bmergePullRequest\b|\benablePullRequestAutoMerge\b/;
const VERCEL_PROD = /\bvercel\b[\s\S]*--prod\b/;
const PROMOTE = /\b(?:npm|pnpm|yarn|npx|gh)\b[\s\S]*\bpromote\b|\bworkflow[\s\S]*promote|\bpromote(?:\.yml|\.yaml)\b/;

const CONSENT_MAX_AGE_MS = 30 * 60_000;
const CONSENT_MAX_FUTURE_MS = 60_000;
const FULL_SHA = /^[0-9a-f]{40}$/;
// Flagi `gh pr merge`, które biorą wartość; bez tej listy wartość pomyliłaby się z numerem PR.
const VALUE_FLAGS = new Set(["-R", "--repo", "--match-head-commit", "-b", "--body", "-F", "--body-file", "-t", "--subject", "-A", "--author-email"]);

function commandSegments(command) {
  return String(command ?? "")
    .split(/\s*(?:&&|\|\||;|\||\n)\s*/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function tokenize(segment) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (let match = pattern.exec(segment); match; match = pattern.exec(segment)) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function remoteUrlFromGit(cwd) {
  const result = spawnSync("git", ["-C", cwd, "remote", "get-url", "origin"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function parseRepo(text) {
  const match = /github\.com[:/]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/|$)/.exec(String(text ?? ""));
  return match ? { owner: match[1], repo: match[2] } : undefined;
}

function consentExists({ owner, repo, number, sha }, { consentDir, now }) {
  const names = [[owner, repo], [owner.toLowerCase(), repo.toLowerCase()]];
  for (const [o, r] of names) {
    try {
      const age = now - statSync(path.join(consentDir, o, r, `${number}__${sha}`)).mtimeMs;
      if (age < CONSENT_MAX_AGE_MS && age > -CONSENT_MAX_FUTURE_MS) return true;
    } catch {
      // brak pliku zgody
    }
  }
  return false;
}

// Zwraca listę powodów blokady; pusta lista = merge dopuszczony (warunki z polityki merge'a agenta).
function mergeDenials(segment, cwd, deps) {
  const tokens = tokenize(segment);
  const at = tokens.findIndex((token, i) => token === "pr" && tokens[i + 1] === "merge");
  if (at < 0) return ["pull request merge: nie umiem odczytać komendy"];
  const denials = [];
  const args = tokens.slice(at + 2);
  let sha;
  let repoFlag;
  let target;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (flag === "--admin") denials.push("pull request merge: --admin jest zabroniony");
    else if (flag === "--auto") denials.push("pull request merge: --auto jest zabroniony");
    else if (VALUE_FLAGS.has(flag)) {
      const value = inline ?? args[(i += 1)];
      if (flag === "--match-head-commit") sha = value;
      if (flag === "-R" || flag === "--repo") repoFlag = value;
    } else if (/^-R./.test(arg)) repoFlag = arg.slice(2);
    else if (!arg.startsWith("-") && target === undefined) target = arg;
  }
  if (!FULL_SHA.test(sha ?? "")) denials.push("pull request merge: wymaga --match-head-commit <40 hex> (bez podstawień powłoki)");
  const numberMatch = /^(?:#)?(\d+)$/.exec(target ?? "") ?? /\/pull\/(\d+)/.exec(target ?? "");
  if (!numberMatch) denials.push("pull request merge: podaj numer PR albo jego URL");
  const repo = parseRepo(repoFlag && !repoFlag.includes("github.com") ? `github.com/${repoFlag}` : repoFlag) ?? parseRepo(target) ?? parseRepo(deps.remoteUrl(cwd));
  if (!repo) denials.push("pull request merge: nie ustaliłem repo (-R albo origin)");
  if (denials.length) return denials;
  if (!consentExists({ ...repo, number: numberMatch[1], sha }, deps)) {
    return [`pull request merge: brak świeżej zgody ${repo.owner}/${repo.repo}/${numberMatch[1]}__${sha.slice(0, 7)}… w ${deps.consentDir} (ship.mjs, do 30 min)`];
  }
  return [];
}

export function classifyShellCommand(command, options = {}) {
  const deps = {
    consentDir: options.consentDir ?? path.join(homedir(), ".claude", "merge-zgody"),
    now: options.now ?? Date.now(),
    remoteUrl: options.remoteUrl ?? remoteUrlFromGit,
  };
  let cwd = options.cwd ?? process.cwd();
  const reasons = [];
  if (API_MERGE.test(String(command ?? ""))) reasons.push("pull request merge przez API");
  for (const segment of commandSegments(command)) {
    const cd = /^cd (\S+)$/.exec(segment);
    if (cd) cwd = path.resolve(cwd, cd[1].replace(/^["']|["']$/g, ""));
    if (PUSH_MAIN.test(segment)) reasons.push("push to main");
    if (GH_MERGE.test(segment)) reasons.push(...mergeDenials(segment, cwd, deps));
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
  let cwd;
  if (!command) {
    // Cursor: { command, cwd }; Claude Code: { tool_input: { command }, cwd }.
    const payload = JSON.parse((await readStdin()) || "{}");
    command = payload.command ?? payload.tool_input?.command ?? "";
    cwd = payload.cwd;
  }
  const response = hookResponse(command, { cwd });
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.permission === "deny") process.exitCode = 2;
}
