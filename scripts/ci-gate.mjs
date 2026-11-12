// Logika joba `gate` w ci.yml: audyt zależności, ocena wyniku jobów `needs` i czekanie na checki z innych workflow.
// Zasady: AGENTS.md (Validation Commands), nazwa `gate` to kontrakt z rulesetem na main.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const FAILING_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"]);

export function evaluateNeeds(needs) {
  const entries = needs && typeof needs === "object" ? Object.entries(needs) : [];
  if (entries.length === 0) return { ok: false, failed: [{ job: "(brak)", result: "no needs" }] };
  const failed = entries
    .filter(([, value]) => value?.result !== "success")
    .map(([job, value]) => ({ job, result: value?.result ?? "unknown" }));
  return { ok: failed.length === 0, failed };
}

function newestByName(runs) {
  const byName = new Map();
  for (const run of runs) {
    const current = byName.get(run.name);
    if (!current || run.id > current.id) byName.set(run.name, run);
  }
  return byName;
}

// Skipped przechodzi tylko na drafcie (claude-review.yml ma `if: draft == false`); na gotowym PR skipped to stan
// przejściowy (nowy przebieg jeszcze się nie zaczął), więc czekamy, a po limicie czasu bramka pada.
export function classifyCheckRuns(runs, required, { draft = false } = {}) {
  const newest = newestByName(runs);
  const details = [];
  let pending = false;
  let failed = false;
  for (const name of required) {
    const run = newest.get(name);
    if (!run) {
      pending = true;
      details.push({ name, state: "pending", note: "brak checku" });
    } else if (run.status !== "completed") {
      pending = true;
      details.push({ name, state: "pending", note: run.status });
    } else if (run.conclusion === "success" || run.conclusion === "neutral") {
      details.push({ name, state: "pass" });
    } else if (run.conclusion === "skipped") {
      if (draft) details.push({ name, state: "pass", note: "skipped (draft)" });
      else {
        pending = true;
        details.push({ name, state: "pending", note: "skipped na gotowym PR" });
      }
    } else if (FAILING_CONCLUSIONS.has(run.conclusion)) {
      failed = true;
      details.push({ name, state: "fail", note: run.conclusion });
    } else {
      failed = true;
      details.push({ name, state: "fail", note: String(run.conclusion) });
    }
  }
  return { state: failed ? "fail" : pending ? "pending" : "pass", details };
}

export async function waitForChecks({ listCheckRuns, required, draft, timeoutMs, intervalMs, now = Date.now, sleep }) {
  const start = now();
  let last = { state: "pending", details: [] };
  for (;;) {
    try {
      last = classifyCheckRuns(await listCheckRuns(), required, { draft });
    } catch (error) {
      last = { state: "pending", details: [{ name: "api", state: "pending", note: String(error.message ?? error) }] };
    }
    if (last.state === "pass") return { ok: true, details: last.details };
    if (last.state === "fail") return { ok: false, reason: "required check failed", details: last.details };
    if (now() - start >= timeoutMs) return { ok: false, reason: "timeout waiting for required checks", details: last.details };
    await sleep(intervalMs);
  }
}

export function summarizeAudit(report) {
  if (!report || typeof report !== "object") return { blocking: [], error: "npm audit nie zwrócił JSON" };
  if (report.error) return { blocking: [], error: report.error.summary || report.error.code || "npm audit error" };
  const vulnerabilities = Object.values(report.vulnerabilities ?? {});
  const blocking = vulnerabilities
    .filter((v) => BLOCKING_SEVERITIES.has(v.severity))
    .map((v) => ({ name: v.name, severity: v.severity }));
  return { blocking, total: vulnerabilities.length };
}

export function auditVerdict(summary, mode) {
  if (mode !== "report" && mode !== "enforce") throw new Error(`Nieznany tryb audytu: ${mode}`);
  const enforce = mode === "enforce";
  if (summary.error) {
    return { exitCode: enforce ? 1 : 0, message: `Audyt niedostępny (${summary.error}).` };
  }
  if (summary.blocking.length === 0) return { exitCode: 0, message: "Audyt: brak podatności high/critical w zależnościach produkcyjnych." };
  const list = summary.blocking.map((v) => `${v.name} (${v.severity})`).join(", ");
  return {
    exitCode: enforce ? 1 : 0,
    message: `Audyt: ${summary.blocking.length} podatności high/critical: ${list}.${enforce ? "" : " Tryb report: nie blokuje."}`,
  };
}

function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

function ghApi(endpoint) {
  const result = spawnSync("gh", ["api", "--paginate", "--slurp", endpoint], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gh api ${endpoint} failed`);
  return JSON.parse(result.stdout);
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === "audit") {
    const mode = process.env.AUDIT_MODE || "report";
    const result = spawnSync("npm", ["audit", "--omit=dev", "--audit-level=high", "--json"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    let report;
    try { report = JSON.parse(result.stdout); } catch { report = undefined; }
    const verdict = auditVerdict(summarizeAudit(report), mode);
    console.log(verdict.message);
    summary(`### Audyt zależności (${mode})\n${verdict.message}`);
    if (!verdict.message.startsWith("Audyt: brak")) console.log(`::${verdict.exitCode ? "error" : "warning"}::${verdict.message}`);
    process.exitCode = verdict.exitCode;
    return;
  }
  if (command === "needs") {
    const verdict = evaluateNeeds(JSON.parse(process.env.NEEDS_JSON || "null"));
    if (!verdict.ok) {
      const text = `Bramka: padły wymagane joby: ${verdict.failed.map((f) => `${f.job}=${f.result}`).join(", ")}`;
      console.log(`::error::${text}`);
      summary(`### gate\n${text}`);
      process.exitCode = 1;
    } else console.log("Bramka: wszystkie joby tego workflow zielone.");
    return;
  }
  if (command === "wait") {
    const repo = process.env.GITHUB_REPOSITORY;
    const sha = process.env.HEAD_SHA;
    const required = (process.env.REQUIRED_CHECKS || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!repo || !/^[0-9a-f]{40}$/.test(sha || "") || required.length === 0) throw new Error("Brak GITHUB_REPOSITORY, HEAD_SHA albo REQUIRED_CHECKS");
    const result = await waitForChecks({
      listCheckRuns: async () => ghApi(`repos/${repo}/commits/${sha}/check-runs?per_page=100`).flatMap((page) => page.check_runs),
      required,
      draft: process.env.PR_DRAFT === "true",
      timeoutMs: Number(process.env.WAIT_TIMEOUT_MIN || 25) * 60_000,
      intervalMs: Number(process.env.WAIT_INTERVAL_SEC || 15) * 1000,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });
    const table = result.details.map((d) => `- ${d.name}: ${d.state}${d.note ? ` (${d.note})` : ""}`).join("\n");
    console.log(table);
    summary(`### gate\n${result.ok ? "Wszystkie wymagane checki zielone." : `Blokada: ${result.reason}.`}\n${table}`);
    if (!result.ok) {
      console.log(`::error::Bramka: ${result.reason}`);
      process.exitCode = 1;
    }
    return;
  }
  throw new Error(`Użycie: ci-gate.mjs audit|needs|wait (dostałem: ${[command, ...rest].join(" ")})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}
