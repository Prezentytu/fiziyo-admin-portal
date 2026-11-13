// Po merge'u do main: czeka, aż devportal (DEV) zwróci w nagłówku x-fiziyo-admin-sha commit merge'a albo późniejszy,
// i komentuje zmergowany PR wynikiem. Dotyka tylko DEV; adres PROD jest odrzucany (AGENTS.md, Never 1).
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DEV_URL = "https://devportal.fiziyo.pl";
const SHA = /^[0-9a-f]{40}$/;

export function assertDevUrl(url) {
  if (url !== DEV_URL) throw new Error(`Raport po wdrożeniu dotyczy tylko ${DEV_URL}, dostałem ${url}`);
  return url;
}

export function pickMergedPr(prs, mergeSha) {
  return prs.find((pr) => pr.merged_at && pr.merge_commit_sha === mergeSha);
}

// Zwraca identical (devportal serwuje merge), later (serwuje potomka merge'a) albo timeout z ostatnim odczytem.
export async function waitForDeploy({ readDeployed, compare, mergeSha, timeoutMs, intervalMs, now = Date.now, sleep }) {
  const start = now();
  let last = {};
  for (;;) {
    try {
      const seen = await readDeployed();
      if (SHA.test(seen.sha ?? "")) {
        last = { deployedSha: seen.sha, deploymentId: seen.deploymentId };
        if (seen.sha === mergeSha) return { state: "identical", ...last };
        const status = await compare(mergeSha, seen.sha);
        if (status === "ahead" || status === "identical") return { state: "later", ...last };
      }
    } catch {
      // DEV w trakcie wdrożenia albo chwilowy błąd API: próbujemy do limitu czasu.
    }
    if (now() - start >= timeoutMs) return { state: "timeout", ...last };
    await sleep(intervalMs);
  }
}

const short = (sha) => sha.slice(0, 7);

export function buildComment({ repo, pr, mergeSha, url, runUrl, waitedMs, result }) {
  const ok = result.state === "identical" || result.state === "later";
  const minutes = Math.max(1, Math.round(waitedMs / 60_000));
  const commitLink = `[\`${short(mergeSha)}\`](https://github.com/${repo}/commit/${mergeSha})`;
  const lines = [`<!-- post-deploy-devportal:${mergeSha} -->`];
  if (ok) {
    lines.push(`**DEV po merge'u: wdrożenie potwierdzone** (PR #${pr}, po ${minutes} min).`);
    lines.push("");
    lines.push(`- Commit merge'a: ${commitLink}`);
    lines.push(
      result.state === "identical"
        ? `- \`x-fiziyo-admin-sha\` na ${url}/sign-in: \`${short(result.deployedSha)}\` (ten sam commit)`
        : `- \`x-fiziyo-admin-sha\` na ${url}/sign-in: \`${short(result.deployedSha)}\` (późniejszy commit zawiera ten merge)`
    );
  } else {
    lines.push(`**DEV po merge'u: wdrożenie nie potwierdzone** w ${minutes} min (PR #${pr}).`);
    lines.push("");
    lines.push(`- Commit merge'a: ${commitLink}`);
    lines.push(
      result.deployedSha
        ? `- \`x-fiziyo-admin-sha\` na ${url}/sign-in: \`${short(result.deployedSha)}\` (nie zawiera tego merge'a)`
        : `- \`x-fiziyo-admin-sha\` na ${url}/sign-in: brak odczytu (adres nie odpowiedział poprawnym nagłówkiem)`
    );
    lines.push("- Sprawdź wdrożenie w Vercel (build, przypięcie domeny w `pin-devportal`) i uruchom ten workflow ponownie.");
  }
  if (result.deploymentId) lines.push(`- Deployment: \`${result.deploymentId}\``);
  lines.push(`- Linki: [${url}](${url}), [przebieg raportu](${runUrl})`);
  return lines.join("\n");
}

function gh(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gh ${args.join(" ")} failed`);
  return result.stdout;
}

const ghJson = (endpoint) => JSON.parse(gh(["api", endpoint]));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--dry-run") out.dryRun = true;
    else if (key.startsWith("--")) out[key.slice(2)] = argv[(i += 1)];
    else throw new Error(`Nieznany argument: ${key}`);
  }
  return out;
}

async function main(argv) {
  const args = parseArgs(argv);
  const repo = process.env.GITHUB_REPOSITORY || "Prezentytu/fiziyo-admin-portal";
  const url = assertDevUrl(args.url || DEV_URL);
  let mergeSha = args.sha;
  let pr = args.pr ? Number(args.pr) : undefined;
  if (pr && !mergeSha) {
    const data = ghJson(`repos/${repo}/pulls/${pr}`);
    if (!data.merged_at) throw new Error(`PR #${pr} nie jest zmergowany`);
    mergeSha = data.merge_commit_sha;
  }
  if (!SHA.test(mergeSha || "")) throw new Error("Podaj --sha <40 hex> albo --pr <numer zmergowanego PR>");
  if (!pr) {
    const found = pickMergedPr(ghJson(`repos/${repo}/commits/${mergeSha}/pulls`), mergeSha);
    pr = found?.number;
  }

  const timeoutMs = Number(args["timeout-min"] || 20) * 60_000;
  const intervalMs = Number(args["interval-sec"] || 20) * 1000;
  const started = Date.now();
  const result = await waitForDeploy({
    readDeployed: async () => {
      const response = await fetch(`${url}/sign-in`, { method: "HEAD", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20_000) });
      return { sha: response.headers.get("x-fiziyo-admin-sha") ?? "", deploymentId: response.headers.get("x-fiziyo-deployment-id") ?? undefined };
    },
    compare: async (from, to) => ghJson(`repos/${repo}/compare/${from}...${to}`).status,
    mergeSha,
    timeoutMs,
    intervalMs,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  const runUrl = process.env.GITHUB_RUN_ID ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : `https://github.com/${repo}/actions`;
  const body = buildComment({ repo, pr: pr ?? "?", mergeSha, url, runUrl, waitedMs: Date.now() - started, result });
  console.log(body);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);

  if (args.dryRun) console.log("\n[dry-run] nie postuję komentarza.");
  else if (!pr) console.log("Brak zmergowanego PR dla tego commita (push bezpośredni?): komentarza nie ma gdzie dodać.");
  else {
    const marker = `<!-- post-deploy-devportal:${mergeSha} -->`;
    const existing = ghJson(`repos/${repo}/issues/${pr}/comments?per_page=100`).find((c) => c.body?.startsWith(marker));
    if (existing) gh(["api", "-X", "PATCH", `repos/${repo}/issues/comments/${existing.id}`, "--input", "-"], JSON.stringify({ body }));
    else gh(["api", "-X", "POST", `repos/${repo}/issues/${pr}/comments`, "--input", "-"], JSON.stringify({ body }));
  }
  if (result.state === "timeout") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}
