// Kopie wspólnych dokumentów z kanonu w Prezentytu/fizjo-app@main.
// Cloud Agent widzi tylko to repo, więc kanon trzymamy tu jako kopię z nagłówkiem.
//
//   npm run docs:sync                    odśwież aktywne kopie
//   npm run docs:sync -- --dry-run       pokaż, co by się zmieniło, bez zapisu
//   npm run docs:sync -- --include-held  odśwież także kopie wstrzymane
//
// Wymaga `gh` zalogowanego z prawem odczytu Prezentytu/fizjo-app.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_REPO = "Prezentytu/fizjo-app";
export const SOURCE_REF = "main";

// held: true = kanon w fizjo-app jest w przebudowie (2026-10-29); kopii nie nadpisujemy,
// dopóki fakty tylko z portalu nie trafią do kanonu. Po merge kanonu zdejmij `held`.
export const SHARED_DOCS = [
  { remote: ".ai/VISION.md", local: ".ai/VISION.md" },
  { remote: ".ai/ECOSYSTEM.md", local: ".ai/ECOSYSTEM.md", held: true },
  { remote: ".ai/DOMAIN_MODEL.md", local: ".ai/DOMAIN_MODEL.md", held: true },
];

const HEADER_RE = /^<!-- kopia z ([\w.-]+\/[\w.-]+)@([0-9a-f]{40}):(\S+); nie edytuj, odśwież: npm run docs:sync -->\n/;

export function header(sha, remotePath, repo = SOURCE_REPO) {
  return `<!-- kopia z ${repo}@${sha}:${remotePath}; nie edytuj, odśwież: npm run docs:sync -->\n`;
}

export function withHeader(content, sha, remotePath, repo = SOURCE_REPO) {
  return `${header(sha, remotePath, repo)}\n${content.replace(/^﻿/, "")}`;
}

export function parseHeader(text) {
  const match = HEADER_RE.exec(text);
  if (!match) return null;
  return { repo: match[1], sha: match[2], path: match[3] };
}

export function stripHeader(text) {
  return text.replace(HEADER_RE, "").replace(/^\n/, "");
}

function gh(args) {
  return execFileSync("gh", ["api", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function fetchHeadSha() {
  return gh([`repos/${SOURCE_REPO}/commits/${SOURCE_REF}`, "--jq", ".sha"]).trim();
}

function fetchFile(remotePath, sha) {
  const base64 = gh([`repos/${SOURCE_REPO}/contents/${remotePath}?ref=${sha}`, "--jq", ".content"]);
  return Buffer.from(base64.replace(/\s/g, ""), "base64").toString("utf8");
}

export function syncSharedDocs(root, { dryRun = false, includeHeld = false, fetch = { fetchHeadSha, fetchFile } } = {}) {
  const sha = fetch.fetchHeadSha();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Unexpected ${SOURCE_REPO}@${SOURCE_REF} sha: ${sha}`);
  const report = [];
  for (const doc of SHARED_DOCS) {
    const localPath = path.join(root, doc.local);
    if (doc.held && !includeHeld) {
      report.push(`held     ${doc.local} (kanon w przebudowie; --include-held nadpisze)`);
      continue;
    }
    const next = withHeader(fetch.fetchFile(doc.remote, sha), sha, doc.remote);
    const current = fs.existsSync(localPath) ? fs.readFileSync(localPath, "utf8") : null;
    if (current === next) {
      report.push(`ok       ${doc.local} = ${SOURCE_REPO}@${sha.slice(0, 7)}:${doc.remote}`);
      continue;
    }
    const before = current === null ? 0 : current.split("\n").length;
    const after = next.split("\n").length;
    const verb = dryRun ? "would    " : "updated  ";
    report.push(`${verb}${doc.local} <- ${SOURCE_REPO}@${sha.slice(0, 7)}:${doc.remote} (${before} -> ${after} lines)`);
    if (!dryRun) fs.writeFileSync(localPath, next);
  }
  return { sha, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  try {
    const { report } = syncSharedDocs(process.cwd(), {
      dryRun: args.has("--dry-run"),
      includeHeld: args.has("--include-held"),
    });
    console.log(report.join("\n"));
  } catch (error) {
    console.error(`docs:sync failed: ${error.stderr || error.message}`);
    process.exitCode = 1;
  }
}
