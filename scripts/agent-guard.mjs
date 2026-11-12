// Client-side shell gate for Cloud Agents. Not a permission boundary (granice modelu: praca-z-agentami/merge-agenta.md, sekcja Granice).
// Merge agenta: polityka https://github.com/Prezentytu/baza-wiedzy/blob/main/praca-z-agentami/merge-agenta.md
//
// Port strażnika baza-wiedzy PR #57 @ 7d07b6f (narzedzia/claude-code/hooks/guard.py): bramka surowa na pięciu widokach tekstu,
// allowlista pushu, zmienia_repo, KANON_ZGODY. Pominięte jako specyficzne dla tamtego repo: pułapki zsh i macOS (check_zsh, check_macos).
// Dodane tutaj: vercel --prod i promote (AGENTS.md, drzwi jednokierunkowe portalu).
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

class Deny extends Error {}

function deny(reason) {
  throw new Deny(reason);
}

const SECRET = /(^|\/)(\.env(\.[\w-]+)*|[^/]*\.p8|[^/]*\.pem|[^/]*\.key|id_(rsa|ed25519|ecdsa)|google-service-account[^/]*\.json|[^/]*\.kdbx|credentials(\.json)?)$/;
const SAFE_SUFFIX = [".example", ".sample", ".template"];
const READERS_INNER = "cat|head|tail|less|more|bat|grep|rg|awk|sed|cp|scp|base64|xxd|strings|open|source|diff|nl|tac|od|sort|cut|hexdump|tr|\\.";
const READERS = `(${READERS_INNER})`;
const PROTECTED = ["main", "master"];
const SHELLS = ["bash", "sh", "zsh", "dash"];
const GIT_OPT_ARG = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--exec-path", "--config-env"]);
const ASSIGN = /^(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S*)\s+)+/;
const WRAPPER = /^(?:sudo(?:\s+-[^\s]+)*|command(?:\s+-p)?|npx|time|nice|nohup|env)\s+/;
const ENV_PRZYKLADY = [".env", ".env.local", ".env.development", ".env.production", ".env.dev", ".env.prod"];
const PRZ = /^(\d*|&)(>>\||>>|>\||>&|<&|<<<|<<|<>|>|<)([\s\S]*)/;
const PRZ_DOKLEJONE = /^([^'"<>]+?)((?:>>\||>>|>\||>&|<&|<<<|<<|<>|>|<)[\s\S]*)/;
const VERCEL_PROD = /\bvercel\b[\s\S]*--prod\b/;
const PROMOTE = /\b(?:npm|pnpm|yarn|npx|gh)\b[\s\S]*\bpromote\b|\bworkflow[\s\S]*promote|\bpromote(?:\.yml|\.yaml)\b/;

const expandUser = (p) => (p === "~" || p.startsWith("~/") ? homedir() + p.slice(1) : p);
const splitFirst = (re, text) => {
  const m = re.exec(text);
  return m ? text.slice(0, m.index) : text;
};
const removePrefix = (s, prefix) => (s.startsWith(prefix) ? s.slice(prefix.length) : s);
const lastChar = (s) => s[s.length - 1] ?? "";

function fnmatch(name, pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "*") re += ".*";
    else if (ch === "?") re += ".";
    else if (ch === "[") {
      const end = pattern.indexOf("]", i + 2);
      if (end < 0) re += "\\[";
      else {
        let body = pattern.slice(i + 1, end);
        if (body[0] === "!") body = `^${body.slice(1)}`;
        re += `[${body.replace(/\\/g, "\\\\")}]`;
        i = end;
      }
    } else re += ch.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "s").test(name);
}

function isSecret(p0, glob = true) {
  const p = p0.trim().replace(/^['"]+|['"]+$/g, "");
  if (!p || SAFE_SUFFIX.some((suffix) => p.endsWith(suffix))) return false;
  const brace = glob ? /\{([^{}]*,[^{}]*)\}/.exec(p) : null;
  if (brace) {
    // `.env{,.example}` to `.env` i `.env.example` (runda 25)
    return brace[1].split(",").some((alt) => isSecret(p.slice(0, brace.index) + alt + p.slice(brace.index + brace[0].length)));
  }
  const name = p.slice(p.lastIndexOf("/") + 1);
  // Glob rozwija powłoka: `.env*` to także `.env` i `.env.local`; bez dotglob `*` nie rozwija plików z kropką, w cudzysłowie nie rozwija wcale.
  if (glob && name.startsWith(".") && /[*?[]/.test(name) && ENV_PRZYKLADY.some((n) => fnmatch(n, name))) return true;
  return SECRET.test(p);
}

function tokenize(text) {
  return text.match(/\$'(?:[^'\\]|\\.)*'|'[^']*'|"[^"]*"|\S+/g) ?? [];
}

function unquote(token) {
  if (token.length >= 3 && token.startsWith("$'") && token.endsWith("'")) {
    // `$'git status\ngit push'` (runda 24)
    return expandEscapes(token.slice(2, -1)).replace(/\\(.)/g, (_, c) => (c === "t" ? " " : c));
  }
  if (token.length >= 2 && token[0] === token[token.length - 1] && "'\"".includes(token[0])) return token.slice(1, -1);
  return token;
}

// Dzieli po operatorach poza cudzysłowem. Kolejność w `ops` ma znaczenie (dłuższe pierwsze).
function splitOps(text, ops) {
  const parts = [];
  let buf = "";
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      buf += c;
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      buf += c;
      i += 1;
      continue;
    }
    let found = ops.find((op) => text.startsWith(op, i));
    if (found === "|" && buf.endsWith(">")) found = undefined; // `>|` / `>>|` to przekierowanie
    if (found) {
      parts.push(buf);
      buf = "";
      i += found.length;
      continue;
    }
    buf += c;
    i += 1;
  }
  parts.push(buf);
  return parts;
}

function unwrap(stage) {
  let s = stage.trim();
  for (;;) {
    const next = s.replace(ASSIGN, "").replace(WRAPPER, "").trim();
    // Python: WRAPPER.sub(ASSIGN.sub(s, count=1), count=1); replace bez /g zastępuje pierwsze wystąpienie.
    if (next === s) return s.trim();
    s = next;
  }
}

function embeddedScript(stage) {
  const toks = tokenize(stage);
  if (!toks.length) return null;
  if (toks[0] === "eval" && toks.length >= 2) {
    if (toks.length === 2) return unquote(toks[1]);
    return toks.slice(1).map(unquote).join(" ");
  }
  if (!SHELLS.includes(toks[0])) return null;
  let i = 1;
  while (i < toks.length && ["--norc", "--noprofile", "--posix", "--login", "--noediting"].includes(toks[i])) i += 1;
  while (i < toks.length && "-+".includes(toks[i][0]) && toks[i] !== "--") {
    if (toks[i] === "--rcfile" || toks[i] === "--init-file") {
      i += 2;
      continue;
    }
    if (toks[i].startsWith("--")) {
      i += 1;
      continue;
    }
    const flag = toks[i].slice(1);
    if (flag.includes("c")) {
      // Znaki po `c` to kolejne flagi (`-ce`, `-co pipefail`), skrypt to następny argument (runda 23).
      let j = i + 1 + ("oO".includes(lastChar(flag)) ? 1 : 0);
      while (j < toks.length && "-+".includes(toks[j][0]) && toks[j] !== "--") j += "oO".includes(lastChar(toks[j])) ? 2 : 1;
      return j < toks.length ? unquote(toks[j]) : null;
    }
    // `-o pipefail`, `-euo pipefail`, `-O extglob`: opcja z argumentem (runda 22)
    i += flag !== "" && "oO".includes(lastChar(flag)) ? 2 : 1;
  }
  return null;
}

function currentBranch(cwd, gitGlobals) {
  const args = [];
  let repoSet = false;
  for (let i = 0; i < gitGlobals.length; i += 1) {
    const g = gitGlobals[i];
    if (g === "-C" && i + 1 < gitGlobals.length) {
      args.push("-C", expandUser(gitGlobals[i + 1]));
      repoSet = true;
      i += 1;
    } else if (g.startsWith("-C") && g !== "-C") {
      args.push("-C", expandUser(g.slice(2)));
      repoSet = true;
    } else {
      args.push(g);
      if (g === "--git-dir" || g.startsWith("--git-dir=") || g === "--work-tree" || g.startsWith("--work-tree=")) repoSet = true;
    }
  }
  if (!repoSet) args.push("-C", cwd);
  args.push("rev-parse", "--abbrev-ref", "HEAD");
  try {
    const out = spawnSync("git", args, { encoding: "utf8", timeout: 3000 });
    return out.status === 0 ? out.stdout.trim() : "";
  } catch {
    return "";
  }
}

const PUSH_FLAGI = new Set(["-u", "--set-upstream", "-q", "--quiet", "-v", "--verbose", "-n", "--dry-run", "--porcelain", "--atomic", "--no-verify", "--verify", "--tags", "--follow-tags", "--no-follow-tags", "--force-with-lease", "--force-if-includes", "--no-force-if-includes", "--progress", "--no-progress", "-d", "--delete", "--no-recurse-submodules"]);

function isForce(arg) {
  if (arg.startsWith("--force-with-lease")) return false;
  if (arg === "--force" || arg === "-f" || arg.startsWith("--force")) return true;
  if (arg.startsWith("+")) return true;
  return arg.split(":").at(-1).startsWith("+");
}

// Pierwszy argument to zawsze remote, także `git@github.com:o/r.git` (runda 18).
const refspecsOf = (positional) => positional.slice(1);

function refDest(ref) {
  let dst = ref.split(":").at(-1);
  if (dst.startsWith("+")) dst = dst.slice(1);
  // git rozwija cel bez `refs/` jak rev-parse: `heads/main` to `refs/heads/main` (runda 18).
  return removePrefix(removePrefix(dst, "refs/"), "heads/");
}

// Polecenia git, po których bieżąca gałąź i repo zostają te same (runda 20): niejawny push przechodzi tylko wtedy,
// gdy każde inne `git` w wywołaniu jest stąd.
const GIT_BEZ_ZMIANY_GALEZI = new Set(["add", "commit", "status", "log", "diff", "show", "fetch", "rev-parse", "remote", "push", "ls-files", "ls-remote", "check-ignore", "blame", "grep", "shortlog", "describe", "restore", "rm", "mv", "reset", "cherry-pick", "revert", "merge-base", "rev-list", "cat-file", "diff-tree", "pull", "stash"]);
const REBASE_OPCJE = new Set(["--autostash", "--no-autostash", "--continue", "--abort", "--skip", "-q", "--quiet", "-v", "--verbose", "--rebase-merges", "--update-refs", "--no-update-refs"]);

// Czy wywołanie może zmienić bieżącą gałąź albo repo przed niejawnym pushem.
function changesRepo(view) {
  if (/(^|[\s;&|(`{'"\\])(cd|chdir|pushd|popd)(\s|$|[;&|)'"])/.test(view)) return true;
  if (/\bGIT_(DIR|WORK_TREE|COMMON_DIR)=|\bgh\s+pr\s+(checkout|co)\b/.test(view)) return true;
  if (/\benv\s+([^\s;&|]+\s+)*?(-[a-zA-Z]*C|--chdir)/.test(view)) return true; // `env -C ../w2 git push`
  const gitWord = /(?:^|(?<=[\s;&|(`'"=!{\\]))(?:\S*\/)?git(?=\s|$)/g;
  for (const m of view.matchAll(gitWord)) {
    const raw = tokenize(splitFirst(/[;()\n]|(?<!>)\||(?<![<>&])&(?![>&])|&&/, view.slice(m.index + m[0].length)));
    let i = 0;
    while (i < raw.length) {
      const t = unquote(raw[i]);
      const op = PRZ.exec(raw[i]);
      if (op) i += op[3] ? 1 : 2;
      else if (GIT_OPT_ARG.has(t)) i += 2;
      else if (t === "\\" || t.startsWith("-")) i += 1;
      else break;
    }
    if (i >= raw.length) continue; // samo `git` w tekście bez polecenia
    const sub = unquote(raw[i]);
    const rest = raw.slice(i + 1);
    if (sub === "rebase") {
      let positional = 0;
      for (let j = 0; j < rest.length; j += 1) {
        const op = PRZ.exec(rest[j]);
        if (op) {
          j += op[3] ? 0 : 1;
          continue;
        }
        if (rest[j].startsWith("-")) {
          if (!REBASE_OPCJE.has(rest[j])) return true;
        } else if (rest[j] !== "\\" && rest[j] !== "&") positional += 1;
      }
      if (positional > 1) return true; // `git rebase <upstream> <gałąź>` przełącza na gałąź
    } else if (sub === "stash") {
      // `git stash branch main`, także `git stash 2>/dev/null branch main` (runda 22)
      const words = rest.filter((r, n) => !PRZ.test(r) && !(n && /^\d*(>>|>|<|>\||&>)$/.test(rest[n - 1]))).map(unquote);
      if (words.length && words[0] === "branch") return true;
    } else if (sub === "remote" && rest.some((r) => r.includes("--mirror"))) {
      return true; // `remote add --mirror=push` (runda 22)
    } else if (!GIT_BEZ_ZMIANY_GALEZI.has(sub)) return true;
  }
  return false;
}

let repoChanged = false;

function checkPush(stage, cwd) {
  const raw = tokenize(stage);
  const toks = raw.map(unquote);
  if (!toks.length || toks[0] !== "git") return;
  let i = 1;
  const gitGlobals = [];
  while (i < toks.length) {
    const t = toks[i];
    if (t === "--") {
      i += 1;
      break;
    }
    const op = PRZ.exec(raw[i]);
    if (op) {
      // `git 2>&1 push origin main` (runda 20)
      i += op[3] ? 1 : 2;
      continue;
    }
    if (GIT_OPT_ARG.has(t)) {
      if (i + 1 >= toks.length) return;
      gitGlobals.push(t, toks[i + 1]);
      i += 2;
      continue;
    }
    if (t.startsWith("-")) {
      gitGlobals.push(t);
      i += 1;
      continue;
    }
    break;
  }
  const configValue = (g, n) => (["-c", "--config-env"].includes(g) && n + 1 < gitGlobals.length ? gitGlobals[n + 1] : g.startsWith("--config-env=") ? g.slice("--config-env=".length) : null);
  gitGlobals.forEach((g, n) => {
    // `git -c alias.p="push origin main" p` (runda 25)
    if ((configValue(g, n) ?? "").toLowerCase().startsWith("alias.")) deny("Alias git w `-c`/`--config-env` jest zablokowany: strażnik nie widzi, co wykona. Wywołaj polecenie wprost.");
  });
  if (i >= toks.length || toks[i] !== "push") return;
  // `-c remote.origin.push=HEAD:heads/main` albo `-c push.default=upstream` zmienia cel pushu (runda 21).
  gitGlobals.forEach((g, n) => {
    const key = (configValue(g, n) ?? "").split("=")[0].toLowerCase();
    if (key.startsWith("push.") || key.startsWith("branch.") || /^remote\..*\.(push|pushurl|mirror|url)$/.test(key)) {
      deny(`Konfiguracja \`${key}\` w poleceniu git push zmienia cel pushu. Podaj gałąź: \`git push origin <gałąź>\`.`);
    }
  });
  // Przekierowanie usuwamy jak powłoka: operator z celem, reszta słów zostaje argumentami (`git push 2>&1 origin main`
  // to push na main, rundy 18–19). Ucinamy tylko na niecytowanym `#` na początku słowa.
  const pushArgs = [];
  let k = i + 1;
  while (k < raw.length) {
    const r = raw[k];
    if (r.startsWith("#") || r === "&") break; // `&` na końcu to praca w tle
    const op = PRZ.exec(r);
    if (op) {
      k += op[3] ? 1 : 2;
      continue;
    }
    const glued = PRZ_DOKLEJONE.exec(r);
    if (glued && !/^(\d+|&)$/.test(glued[1])) {
      // `feat>/dev/null`: słowo i doklejone przekierowanie (runda 20)
      pushArgs.push(glued[1]);
      k += PRZ.exec(glued[2])[3] ? 1 : 2;
      continue;
    }
    pushArgs.push(toks[k]);
    k += 1;
  }
  if (pushArgs.some((a) => ["--all", "--branches", "--mirror"].includes(a) || a.startsWith("--mirror="))) {
    deny("`git push --all` / `--branches` / `--mirror` przesuwa też main. Wypchnij jedną gałąź: `git push origin <gałąź>`.");
  }
  if (pushArgs.some(isForce)) deny("Force-push bez --force-with-lease jest zablokowany. Użyj `git push --force-with-lease`.");
  // Allowlista (rundy 14–17): każda inna opcja i każda nazwa spoza literału to DENY.
  const positional = [];
  for (let j = 0; j < pushArgs.length; j += 1) {
    const a = pushArgs[j].replace(/\)+$/, ""); // `(cd x && git push origin feat)`: nawias zamyka podpowłokę
    if (a === "" || a === "\\") continue; // samotny `\` to kontynuacja linii w widoku surowym
    if (a === "-o" || a === "--push-option") {
      j += 1;
      continue;
    }
    if (a.startsWith("-")) {
      const known = PUSH_FLAGI.has(a) || /^-[uqvn]+$/.test(a) || a.startsWith("--force-with-lease=") || a.startsWith("--push-option=") || /^--recurse-submodules=(check|on-demand|only|no)$/.test(a);
      if (!known) deny(`Opcja \`${a}\` w git push jest poza listą strażnika. Użyj \`git push [-u] origin <gałąź>\`.`);
    } else if (!/^(?:\+?[A-Za-z0-9._/@-]+(:[A-Za-z0-9._/-]+)?|[A-Za-z0-9._/:@-]+)$/.test(a) || a.includes("*")) {
      deny(`Cel pushu \`${a}\` nie jest literalną nazwą gałęzi. Podaj ją wprost: \`git push origin <gałąź>\`.`);
    } else positional.push(a);
  }
  const refspecs = refspecsOf(positional);
  let implicit = refspecs.length === 0;
  for (const ref of refspecs) {
    const dst = refDest(ref);
    if (ref.replace(/^\++/, "") === ":") deny("`git push origin :` wypycha wszystkie pasujące gałęzie, także main. Podaj jedną gałąź.");
    if (PROTECTED.includes(dst)) deny(`Push na \`${dst}\` jest zablokowany. Otwórz PR; merge robi człowiek.`);
    if (dst === "HEAD" || dst === "@" || /[$`]/.test(dst)) implicit = true; // `HEAD`, `@` i `$(git branch --show-current)` to bieżąca gałąź
  }
  if (implicit) {
    // Repo, w którym stoi push, zna strażnik tylko bez `cd`/`pushd` w poleceniu i bez -C/--git-dir/--work-tree.
    if (repoChanged || gitGlobals.some((g) => ["-C", "--git-dir", "--work-tree"].includes(g) || g.startsWith("-C") || g.startsWith("--git-dir=") || g.startsWith("--work-tree="))) {
      deny("Push bez jawnej gałęzi docelowej przechodzi tylko po poleceniach git z listy (add, commit, status, log, diff, show, fetch, rebase na upstream) i bez `cd`, -C albo GIT_DIR: inaczej strażnik nie wie, czy to main. Podaj gałąź: `git push -u origin <gałąź>`.");
    }
    const current = removePrefix(currentBranch(cwd, gitGlobals), "heads/"); // tag `main` obok gałęzi daje `heads/main`
    if (PROTECTED.includes(current)) deny("Bieżąca gałąź to main/master: push bez jawnej gałęzi trafiłby na nią. Utwórz gałąź i PR.");
    if (current === "" || current === "HEAD") {
      // Rebase w toku albo odłączony HEAD: `rebase --abort && git push` wraca na main (runda 21).
      deny("Strażnik nie ustalił bieżącej gałęzi (rebase w toku, odłączony HEAD). Podaj gałąź: `git push origin <gałąź>`.");
    }
  }
}

const ZGODA_WAZNA_MS = 30 * 60_000;
const ZGODA_PRZYSZLOSC_MS = 60_000;
const BEZ_MERGE_AGENTA = ["baza-wiedzy", "notatki-adam"];

const KANON_ZGODY = /^(?:\S*\/)?gh +pr +merge +(?<numer>\d+) +(?:-R *|--repo[ =])(?<repo>[\w.-]+\/[\w.-]+) +--(?:merge|squash|rebase) +--match-head-commit[ =](?<sha>[0-9a-fA-F]{40})(?: +--delete-branch)?(?: +--body +(?:"[^"$`\\]*"|'[^']*'))?$/;

// Merge agenta tylko na zgodę ship.mjs: kształt komendy jak z ship.mjs (stała kolejność, długie opcje, treść tylko w końcowym
// `--body`) i plik <consentDir>/<owner>/<repo>/<N>__<sha> młodszy niż 30 min. Zwraca powód odmowy albo null.
function consentDenial(stage, deps) {
  const m = KANON_ZGODY.exec(stage.trim());
  if (!m) return "komenda inna niż z ship.mjs (gh pr merge <N> -R <owner/repo> --merge --match-head-commit <sha> …)";
  const { numer, sha } = m.groups;
  const repo = m.groups.repo.toLowerCase();
  if (BEZ_MERGE_AGENTA.includes(repo.split("/")[1])) return `${repo}: merge to akceptacja człowieka`;
  let age;
  try {
    age = deps.now - statSync(path.join(deps.consentDir, ...repo.split("/"), `${numer}__${sha.toLowerCase()}`)).mtimeMs;
  } catch {
    return "ship.mjs nie dał zgody (etap gotowe-agent) dla tego PR i SHA";
  }
  if (age > ZGODA_WAZNA_MS || age < -ZGODA_PRZYSZLOSC_MS) return "zgoda ship.mjs jest starsza niż 30 minut albo z przyszłości: uruchom ship.mjs ponownie";
  return null;
}

// Słowa powłoki przed poleceniem (pętla, if, podpowłoka, xargs): bez ich zdjęcia `do gh pr merge` omijał regułę.
const PREFIKS = /^(?:(?:do|then|else|exec|time)\s+|[!({]\s*|xargs(?:\s+-\S+)*\s+|\\(?=\S*gh\b))/;
const ZAPIS_API = /(^|\s)((-X|--method)[\s=]*(POST|PUT|PATCH|DELETE)\b|(--field|--raw-field|--input)(\s|=)|-[fF](\s|=|\S))/;

function stripShellPrefixes(stage) {
  let s = stage.trim();
  for (;;) {
    let n = s.replace(PREFIKS, "").trimStart();
    n = n.replace(/^(["'])((?:\S*\/)?gh)\1(?=\s)/, "$2");
    if (n === s) return s;
    s = n;
  }
}

// Słowa jak w powłoce (shlex.split w trybie POSIX); błąd (niedomknięty cudzysłów) rzuca.
function shlexSplit(s) {
  const out = [];
  let cur = null;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (" \t\r\n".includes(c)) {
      if (cur !== null) out.push(cur);
      cur = null;
      i += 1;
    } else if (c === "\\") {
      if (i + 1 >= s.length) throw new Error("No escaped character");
      cur = (cur ?? "") + s[i + 1];
      i += 2;
    } else if (c === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new Error("No closing quotation");
      cur = (cur ?? "") + s.slice(i + 1, end);
      i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      let buf = "";
      for (;;) {
        if (j >= s.length) throw new Error("No closing quotation");
        const d = s[j];
        if (d === '"') break;
        if (d === "\\") {
          if (j + 1 >= s.length) throw new Error("No escaped character");
          const n = s[j + 1];
          buf += n === '"' || n === "\\" ? n : d + n;
          j += 2;
        } else {
          buf += d;
          j += 1;
        }
      }
      cur = (cur ?? "") + buf;
      i = j + 1;
    } else {
      cur = (cur ?? "") + c;
      i += 1;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

function shellWords(stage) {
  try {
    return shlexSplit(stage);
  } catch {
    return tokenize(stage).map(unquote);
  }
}

const shlexQuote = (w) => (w === "" ? "''" : /[^\w@%+=:,./-]/.test(w) ? `'${w.replace(/'/g, `'"'"'`)}'` : w);

// Metoda `gh api` ze słów, nie z tekstu: gh bierze ostatnie -X/--method (runda 4).
function apiMethod(stage) {
  const words = shellWords(stage);
  let method = null;
  words.forEach((w, i) => {
    if ((w === "-X" || w === "--method") && i + 1 < words.length) method = words[i + 1];
    else if (w.startsWith("--method=")) method = w.slice("--method=".length);
    else if (w.startsWith("-X") && w.length > 2) method = w.slice(2);
  });
  return method ? method.toUpperCase() : null;
}

// `$(gh …)` i `` `gh …` `` w surowym tekście, bez modelowania cudzysłowów. Fail-closed: także dane w '…'.
function ghSubstitutions(text) {
  return [...text.matchAll(/(?:\$\(|`)\s*((?:\S*\/)?gh\s[^)`]*)/g)].map((m) => m[1]);
}

// Wywołania gh w środku polecenia (`echo $(gh …)`, `out=$(gh …)`, argument pętli): każde sprawdzane osobno.
function nestedGh(stage) {
  const words = shellWords(stage);
  const found = [];
  words.forEach((t, i) => {
    if (i === 0 && /^(\S*\/)?gh$/.test(t)) return;
    if (/^(?:[{\\!]*|.*(?:\$\(|`|\())(\S*\/)?gh$/.test(t)) found.push(["gh", ...words.slice(i + 1).map(shlexQuote)].join(" "));
  });
  return [...found, ...ghSubstitutions(stage)];
}

const GH_KOMENDY = new Set(["pr", "api", "alias", "issue", "repo", "run", "workflow", "release", "search", "gist", "label", "secret", "variable", "auth", "browse", "cache", "codespace", "project", "ruleset", "status", "extension", "config"]);
const PR_PODKOMENDY = new Set(["merge", "review", "view", "list", "create", "checks", "edit", "comment", "diff", "status", "close", "reopen", "ready", "checkout", "lock", "unlock", "revert", "update-branch", "ls", "new", "co"]);

// (komenda, podkomenda) ze słów powłoki, strukturalnie: pierwsza znana komenda gh, a po `pr` pierwsza znana podkomenda.
function ghSubcommand(stage) {
  const words = shellWords(stage);
  if (!words.length || !/^(\S*\/)?gh$/.test(words[0])) return [null, null];
  for (let i = 1; i < words.length; i += 1) {
    const w = words[i];
    if (!GH_KOMENDY.has(w)) continue;
    const rest = words.slice(i + 1);
    if (w === "pr") return [w, rest.find((x) => PR_PODKOMENDY.has(x)) ?? null];
    if (w === "alias") return [w, rest.find((x) => !x.startsWith("-")) ?? null];
    return [w, null];
  }
  return [null, null];
}

function checkMerge(stage0, raw, deps, nested = false) {
  const stage = stripShellPrefixes(stage0);
  const [command, sub] = ghSubcommand(stage);
  const words = shellWords(stage);
  if (words.length > 1 && /^(\S*\/)?gh$/.test(words[0]) && words[1].startsWith("-") && ["merge", "review", "api", "alias"].some((w) => words.includes(w))) {
    // Wartość flagi przed komendą może sama wyglądać jak komenda (`gh -b api pr merge`), runda 11.
    deny("Flaga przed komendą gh przy merge/review/api/alias: podaj komendę zaraz po `gh`, flagi po niej.");
  }
  if (command === "pr" && sub === "merge" && !/^(\S*\/)?gh\s+pr\s+merge\b/.test(stage)) {
    deny("Merge PR tylko w formie z ship.mjs: `gh pr merge <N> -R <owner/repo> --match-head-commit <sha> …`, bez flag przed `pr merge`.");
  }
  // Także surowe polecenie: stripShellPrefixes zdejmuje `out=$(gh ` jako przypisanie środowiska (runda 4).
  const inner = new Set([...nestedGh(stage), ...(raw && !nested ? nestedGh(raw) : [])]);
  for (const wewn of inner) checkMerge(wewn, raw, deps, true);
  if (/^(\S*\/)?gh\s+pr\s+merge\b/.test(stage)) {
    if (nested) {
      deny("Merge PR wewnątrz pętli, if, xargs, $( ) albo po zmiennej czy opakowaniu (env, command, time) jest zablokowany: guard nie sprawdzi zgody. Wywołaj gołe `gh pr merge` z komendy ship.mjs. Tekst z `gh …` w backtickach (commit, opis) podaj przez heredoc z cudzysłowem: `git commit -F - <<'EOF'`.");
    }
    if (/(^|\s)GH_(REPO|HOST)=/.test(raw)) deny("Merge PR z GH_REPO/GH_HOST w środowisku jest zablokowany: repo podaj jawnie przez -R.");
    let reason;
    try {
      reason = consentDenial(stage.replace(/^\S*\/gh\b/, "gh"), deps); // tu fail-closed: błąd reguły nie może przepuścić merge'u
    } catch (e) {
      reason = `błąd sprawdzania zgody (${e})`;
    }
    if (reason) deny(`Merge PR robi człowiek, chyba że ship.mjs dał etap gotowe-agent: ${reason}.`);
  }
  // Alias omija każdą regułę po nazwie polecenia: `gh alias set m 'pr merge'`, potem `gh m 12`.
  if (command === "alias" && (sub === "import" || (sub === "set" && /merge|review|api/.test(stage)))) deny("Alias gh na merge, review albo api jest zablokowany: omija strażnika.");
  // Agent działa z tokenu człowieka: approve z jego konta podrobiłby zgodę na drzwi jednokierunkowe.
  if (command === "pr" && sub === "review") {
    const toks = tokenize(stage).map(unquote);
    if (toks.some((t) => t === "--approve" || t.startsWith("--approve=") || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(t))) {
      deny("Zatwierdzenie PR (approve) robi człowiek: agent działa z jego konta, więc approve udawałby jego zgodę.");
    }
  }
  if (command === "api") {
    // Jawny GET z -f/-F to parametry zapytania, nie zapis.
    const write = ZAPIS_API.test(stage) && apiMethod(stage) !== "GET";
    if (/\bpulls\/[^/\s]+\/merge\b|\bmergePullRequest\b|\benablePullRequestAutoMerge\b|\benqueuePullRequest\b|\brepos\/[^/\s]+\/[^/\s]+\/merges\b/.test(stage) || (write && /\bgit\/refs\/heads\/(main|master)\b/.test(stage))) {
      deny("Merge przez API jest zablokowany; merge agenta tylko przez `gh pr merge` ze zgodą ship.mjs.");
    }
    if (/\bgraphql\b/.test(stage) && /(^|\s)(-[fF]|--field|--raw-field)[\s=]*query=(@|["']?\$\(|["']?`)|(^|\s)--input(\s|=)/.test(stage)) {
      deny("Zapytanie GraphQL z pliku jest zablokowane: guard nie widzi, czy to merge albo approve. Podaj je w -f query=.");
    }
    // Approve fail-closed: zapis review przechodzi tylko z widocznym zdarzeniem COMMENT albo REQUEST_CHANGES.
    if (write && /\bpulls\/[^/\s]+\/reviews\b/.test(stage) && (/APPROVE\b/i.test(stage) || !/\bevent=(COMMENT|REQUEST_CHANGES)\b/.test(stage))) {
      deny("Zatwierdzenie PR przez API robi człowiek; review z agenta tylko z jawnym event=COMMENT albo REQUEST_CHANGES.");
    }
    if (/\baddPullRequestReview\b|\bsubmitPullRequestReview\b/.test(stage) && (/APPROVE\b/.test(stage) || !/\bevent:\s*(COMMENT|REQUEST_CHANGES)\b/.test(stage))) {
      deny("Zatwierdzenie PR przez API robi człowiek; review z agenta tylko z jawnym event: COMMENT albo REQUEST_CHANGES.");
    }
  }
}

function checkSecretRead(stage, glob = true) {
  let body = stage.replace(/^(?:xargs(?:\s+-[^\s]+)*)\s+/, "");
  body = removePrefix(body, "\\");
  if (!new RegExp(`^${READERS}\\s`).test(body)) return;
  for (const token of tokenize(body)) {
    const shown = unquote(token);
    if (isSecret(shown, glob && !token.startsWith("'") && !token.startsWith('"'))) deny(`Odczyt pliku z sekretami (\`${shown}\`) jest zablokowany. Sekrety tworzy operator poza rozmową.`);
  }
}

function checkStage(stage0, cwd, depth, deps) {
  const surowy = stage0;
  const stage = unwrap(stage0);
  if (!stage) return;
  const script = embeddedScript(stage);
  if (script !== null) {
    checkBash(script, cwd, depth + 1, deps);
    return;
  }
  checkPush(stage, cwd);
  checkMerge(stage, surowy, deps);
  checkSecretRead(stage);
  // Drzwi jednokierunkowe portalu (AGENTS.md): production deploy i promote.
  if (VERCEL_PROD.test(stage)) deny("production deploy");
  if (PROMOTE.test(stage)) deny("promote workflow");
}

const HEREDOC = /<<(?!<)(-?)\s*((?:'[^']*'|"[^"]*"|\\.|[^\s<>;|&()'"\\])+)/y;

// Pierwsze `<<WORD` poza cudzysłowem (`$( )` otwiera nowy kontekst), komentarzem i `$((…))`. Zwraca [z_myslnikiem, ogranicznik, z_cudzyslowem] albo null.
function heredocInLine(line) {
  let q = null;
  let arith = 0;
  const stack = [];
  let j = 0;
  while (j < line.length) {
    const c = line[j];
    if (q === "'") {
      if (c === "'") q = null;
    } else if (c === "\\") j += 1;
    else if (line.startsWith("$(", j) && !line.startsWith("$((", j)) {
      // `"$(cat <<'EOF'"`: podstawienie otwiera własny kontekst cudzysłowów, także w "…".
      stack.push(q);
      q = null;
      j += 1;
    } else if (stack.length && q === null && c === ")") q = stack.pop();
    else if (q === '"') {
      if (c === '"') q = null;
    } else if (c === "'" || c === '"') q = c;
    else if (c === "#" && (j === 0 || " \t;|&(".includes(line[j - 1]))) return null;
    else if (line.startsWith("$((", j)) {
      arith += 1;
      j += 2;
    } else if (arith && line.startsWith("))", j)) {
      arith -= 1;
      j += 1;
    } else if (!arith && line.startsWith("<<", j) && (j === 0 || line[j - 1] !== "<")) {
      HEREDOC.lastIndex = j;
      const m = HEREDOC.exec(line);
      if (m) return [m[1] === "-", m[2].replace(/['"\\]/g, ""), /['"\\]/.test(m[2])];
      j += 1;
    }
    j += 1;
  }
  return null;
}

// Indeks linii z ogranicznikiem od `from` (dokładnie, przy `<<-` bez wiodących tabulatorów) albo null.
function heredocEnd(lines, from, h) {
  for (let k = from; k < lines.length; k += 1) {
    if ((h[0] ? lines[k].replace(/^\t+/, "") : lines[k]) === h[1]) return k;
  }
  return null;
}

// Treść heredoc to dane (opis PR, commit, plik): zdejmujemy ją przed segmentacją. Bez linii z ogranicznikiem niczego nie zdejmujemy.
function stripHeredocs(cmd, onlyQuoted = false) {
  const out = [];
  const lines = cmd.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    out.push(line);
    i += 1;
    const h = heredocInLine(line);
    if (h && (h[2] || !onlyQuoted)) {
      const k = heredocEnd(lines, i, h);
      if (k !== null) i = k + 1;
    }
  }
  return out.join("\n");
}

// Kontynuacja linii jak w powłoce: `\⏎` (nieparzysta liczba ukośników) skleja linie, ale nie w treści heredoca z ogranicznikiem w cudzysłowie.
function joinLines(cmd) {
  const out = [];
  const lines = cmd.split("\n");
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    i += 1;
    while (/(?<!\\)(?:\\\\)*\\$/.test(line) && i < lines.length) {
      line = line.slice(0, -1) + lines[i];
      i += 1;
    }
    out.push(line);
    const h = heredocInLine(line);
    if (h && h[2]) {
      const k = heredocEnd(lines, i, h);
      if (k !== null) {
        out.push(...lines.slice(i, k + 1));
        i = k + 1;
      }
    }
  }
  return out.join("\n");
}

const KANON_MERGE = /^\s*(\S*\/)?gh\s+pr\s+merge\s[^\n;&|<>`$]*$/;
const API_MERGE = /pulls\/[^/\s]+\/merge\b|\bmergePullRequest\b|\benablePullRequestAutoMerge\b|\benqueuePullRequest\b|repos\/[^\s/]+\/[^\s/]+\/merges\b|\bmergeBranch\b|\bupdateRefs?\b|\bcreateCommitOnBranch\b|\/merge-upstream\b|\bgh\s+repo\s+sync\b/;
const SPLIT_GIT = /[;()]|(?<!>)\||(?<![<>&])&(?![>&])|&&/;
const SPLIT_SEGMENT = /;|(?<!>)\||(?<![<>&])&(?![>&])|&&/;
const SPLIT_GH = /[;&|()<>]/;
const REDIRECT_SPLIT = new RegExp(`(?<![\\w./\\\\-])(\\\\?(?:[\\w.-]*/)*\\\\?(?:git|gh|${READERS_INNER}))(?=&?[<>])`, "g");

// `git>/dev/null push`, `cat>&2 .env`: powłoka odcina operator od nazwy polecenia (runda 25).
const splitRedirects = (text) => text.replace(REDIRECT_SPLIT, "$1 ");

// Ucieczka, która w `$'…'`, printf albo `echo -e` daje nową linię, staje się nową linią (rundy 24–25).
function expandEscapes(text) {
  return text
    .replace(/\\(n|r|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8}|[0-7]{1,4})/g, (whole, e) => {
      if (e === "n" || e === "r") return "\n";
      let values;
      if ("xuU".includes(e[0])) values = [parseInt(e.slice(1), 16)];
      else values = [parseInt(e.slice(0, 3), 8), e[0] === "0" ? parseInt(e.slice(1, 4) || "0", 8) : -1];
      return values.some((v) => v === 10 || v === 13) ? "\n" : whole;
    })
    .replace(/\\t/g, " ");
}

// Twarda bramka na surowym tekście (runda 13): nic nie jest zdejmowane ani rozpoznawane jako dane. `git …` i `gh …` sprawdzamy
// wszędzie, gdzie stoją, także w treści heredoca, komentarza i cudzysłowu. Koszt: tekst z `gh pr merge`, `--approve` albo
// `git push … main` w poleceniu dostaje DENY, więc taką treść zapisz do pliku narzędziem Write i podaj `--body-file` / `-F`.
function rawGate(cmd, cwd) {
  const joined = cmd.replace(/(?<!\\)((?:\\\\)*)\\\n/g, "$1");
  // `\n` w `$'…'`, printf i `echo -e` to w wykonaniu nowa linia (runda 24).
  const expanded = splitRedirects(expandEscapes(joined));
  // Widok bez `'`, `"` i backticków: słowo sklejone z cytowanych kawałków wygląda tu jak zwykłe polecenie (runda 23).
  const withoutQuotes = splitRedirects(expanded.replace(/['"`]/g, " "));
  // `"ma"in` to w powłoce jedno słowo `main`: widok z cudzysłowami usuniętymi bez spacji (runda 26).
  const gluedWords = expanded.replace(/['"`]/g, "");
  const views = new Set([cmd, joined, expanded, withoutQuotes, gluedWords]);
  for (const view of views) {
    if (/\bpr['"]?\s+['"]?merge\b/.test(view) && !KANON_MERGE.test(view.trim())) {
      deny("Merge tylko jako samodzielna komenda z ship.mjs, w jednym wywołaniu Bash bez innych poleceń. Tekst z `pr merge` (opis, commit) zapisz do pliku narzędziem Write i podaj `--body-file`.");
    }
    if (/--approve\b|\bpr['"]?\s+['"]?review\b[^\n;&|]*\s-[a-zA-Z]*a|event\W{0,3}APPROVE\b/.test(view)) {
      deny("Zatwierdzenie PR (approve) robi człowiek. Tekst z `--approve` zapisz do pliku narzędziem Write.");
    }
    if (/\bpush\b/.test(view) && /\bGIT_CONFIG\w*=/.test(view)) deny("GIT_CONFIG_* w poleceniu z pushem może zmienić cel pushu. Wywołaj push bez tych zmiennych.");
    if (/\bxargs\b[^;&|\n]*\bgit\b[^;&|\n]*\bpush\b/.test(view)) deny("`xargs git push` dokleja cel z wejścia, którego strażnik nie widzi. Podaj gałąź wprost.");
    if (API_MERGE.test(view)) deny("Merge, auto-merge i kolejka merge'ów przez API są zablokowane; merge tylko komendą z ship.mjs.");
    if (/\$\(\s*(\S*\/)?gh\s|`\s*(\S*\/)?gh\s/.test(view) && /\bmerge\b|\breview\b|\bapi\b/.test(view)) {
      deny("gh w `$( )` albo w backtickach przy merge/review/api jest zablokowane: wywołaj gh osobno.");
    }
    for (const line of view.split("\n")) {
      for (const m of line.matchAll(/(?:^|(?<=[\s;&|(`'"=!{\\]))(\S*\/)?(git|gh)\s/g)) {
        const isGit = m[2] === "git";
        const from = line.slice(m.index);
        let piece = splitFirst(isGit ? SPLIT_GIT : SPLIT_GH, from);
        if (m.index && "'\"`".includes(line[m.index - 1])) {
          // `sh -c 'git push'`: cudzysłów przed git kończy polecenie, ale tylko gdy po zamknięciu stoi granica słowa;
          // `'git push origin '"main"` to jedno słowo i łapie je widok bez cudzysłowów.
          const q = line[m.index - 1];
          const closed = new RegExp(`^([^${q}]*)${q}(?=\\s|$|[;&|()<>])`).exec(piece);
          if (closed) piece = closed[1];
        }
        piece = piece.replace(/^\S*\/(?=(git|gh)\s)/, "");
        if (isGit) {
          checkPush(piece, cwd);
          const segment = splitFirst(SPLIT_SEGMENT, from);
          if (/\bpush\b/.test(segment) && /:(?:refs\/heads\/|heads\/)?(main|master)(?=$|[\s'")])/.test(segment)) deny("Push na main jest zablokowany. Otwórz PR; merge robi człowiek.");
        } else {
          const write = ZAPIS_API.test(piece) && apiMethod(piece) !== "GET";
          if (write && /git\/refs\/heads\/(main|master)\b|\/contents\//.test(piece)) deny("Przesunięcie main przez API (refs, zapis pliku przez contents) jest zablokowane.");
        }
      }
      if (view === withoutQuotes && ![cmd, joined, expanded, gluedWords].includes(view)) continue;
      // W widoku sklejonych słów (`cat ".e"nv`, `"cat" .env`) bez globów: `'.*'` był w cudzysłowie (runda 27).
      const glob = view !== gluedWords || [cmd, joined, expanded].includes(view);
      const readerStart = new RegExp(`(?:^|(?<=[\\s;&|(\`'"=\\\\]))(\\S*/)?(?=${READERS}\\s)`, "g");
      for (const m of line.matchAll(readerStart)) checkSecretRead(splitFirst(SPLIT_GH, line.slice(m.index + m[0].length)), glob);
      // Przekierowanie wejścia z pliku sekretów: `cat<.env`, `"$(<.env)"`, `while read … < .env`.
      for (const m of line.matchAll(/<\s*([^\s<>;&|()'"]+)/g)) {
        if (isSecret(m[1], glob)) deny(`Odczyt pliku z sekretami (\`${m[1]}\`) jest zablokowany.`);
      }
    }
  }
}

function checkBash(cmd0, cwd0, depth, deps) {
  // Segment: &&, ||, ;, nowa linia, potok. `cd` w potoku nie zmienia katalogu rodzeństwa. Opakowania i `bash -c` / `eval` odsłaniają polecenie.
  if (depth > 4) return;
  let cmd = splitRedirects(cmd0);
  let cwd = cwd0;
  // `$(git branch --show-current)` to bieżąca gałąź: dla strażnika to samo co HEAD (runda 17).
  cmd = cmd.replace(/"?(?:\$\(\s*|`\s*)git\s+(?:branch\s+--show-current|rev-parse\s+--abbrev-ref\s+HEAD)\s*[)`]"?/g, "HEAD");
  if (depth === 0) {
    // `cd <literalna ścieżka> && …` na początku to najczęstszy idiom: repo jest znane, więc gałąź sprawdzamy w tej ścieżce.
    // Każde inne `cd` zostaje zmianą repo.
    const leading = /^\s*cd\s+('[^'$`]*'|"[^"$`\\]*"|[A-Za-z0-9._/~@+-]+)(?:\s+(?:\d|&)?>\s*\/dev\/null)*\s*&&/.exec(cmd);
    let rest = cmd;
    let gateCwd = cwd;
    if (leading) {
      rest = cmd.slice(leading[0].length);
      const p = leading[1];
      // Powłoka nie rozwija `~` w cudzysłowie; `cd` jest logiczne, więc `lnk/..` liczymy tekstowo (runda 26).
      const target = "'\"".includes(p[0]) ? unquote(p) : expandUser(p);
      gateCwd = path.posix.normalize(path.posix.isAbsolute(target) ? target : path.posix.join(cwd, target));
    }
    repoChanged = [rest, rest.replace(/(?<!\\)((?:\\\\)*)\\\n/g, "$1")].some(changesRepo);
    rawGate(cmd, gateCwd);
  }
  cmd = joinLines(cmd);
  if (depth === 0) {
    // Heredoc z ogranicznikiem w cudzysłowie powłoka zostawia dosłownie; bez cudzysłowu rozwija `$( )`.
    for (const inner of new Set(ghSubstitutions(stripHeredocs(cmd, true)))) checkMerge(inner, "", deps, true);
  }
  for (const segment of splitOps(stripHeredocs(cmd), ["&&", "||", ";", "\n"])) {
    const seg = segment.trim();
    if (!seg) continue;
    const m = /^cd\s+(\S+)(?:\s+(?:\d|&)?>\s*\/dev\/null)*\s*$/.exec(seg);
    if (m) {
      const target = expandUser(unquote(m[1]));
      cwd = path.posix.isAbsolute(target) ? target : path.posix.join(cwd, target);
      continue;
    }
    for (const stage of splitOps(seg, ["|"])) checkStage(stage.trim(), cwd, depth, deps);
  }
}

export function classifyShellCommand(command, options = {}) {
  const deps = {
    consentDir: options.consentDir ?? process.env.GUARD_ZGODY ?? path.join(homedir(), ".claude", "merge-zgody"),
    now: options.now ?? Date.now(),
  };
  try {
    checkBash(String(command ?? ""), options.cwd ?? process.cwd(), 0, deps);
  } catch (e) {
    if (e instanceof Deny) return { permission: "deny", reasons: [e.message] };
    return { permission: "deny", reasons: [`błąd strażnika (${e}): polecenie zablokowane, bo hook działa fail-closed`] };
  }
  return { permission: "allow", reasons: [] };
}

export function classifyPath(filePath) {
  return isSecret(String(filePath ?? ""))
    ? { permission: "deny", reasons: [`Dostęp do pliku z sekretami (\`${path.basename(String(filePath))}\`) jest zablokowany.`] }
    : { permission: "allow", reasons: [] };
}

function toResponse(result) {
  if (result.permission === "deny") {
    return {
      permission: "deny",
      agent_message: `Blocked: ${result.reasons.join("; ")}. Client hook only, not a permission boundary.`,
      user_message: `Command blocked by agent-guard: ${result.reasons.join("; ")}`,
    };
  }
  return { permission: "allow" };
}

export function hookResponse(command, options) {
  return toResponse(classifyShellCommand(command, options));
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argvCommand = process.argv.slice(2).join(" ").trim();
  let response;
  if (argvCommand) response = hookResponse(argvCommand);
  else {
    // Cursor: { command, cwd }; Claude Code: { tool_name, cwd, tool_input: { command | file_path } }.
    const payload = JSON.parse((await readStdin()) || "{}");
    const tool = payload.tool_name ?? "Bash";
    const input = payload.tool_input ?? {};
    if (["Read", "Edit", "Write"].includes(tool)) response = toResponse(classifyPath(input.file_path));
    else response = hookResponse(payload.command ?? input.command ?? "", { cwd: payload.cwd });
  }
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.permission === "deny") process.exitCode = 2;
}
