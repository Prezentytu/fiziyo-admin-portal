import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEV_APP_URL = "https://devportal.fiziyo.pl";
export const PROD_APP_URL = "https://portal.fiziyo.pl";
export const DEV_API_ORIGIN = "https://fizjo-app-api.azurewebsites.net";
export const PROD_API_ORIGIN = "https://fiziyo-prod.azurewebsites.net";
export const PROJECT_NAME = "fiziyo-admin-portal";

const SHA = /^[0-9a-f]{40}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]{8,80}$/;
const PROJECT_ID = /^(prj_[A-Za-z0-9]+|[a-z0-9][a-z0-9-]{1,62})$/;
const TEAM_ID = /^(team_[A-Za-z0-9]+|[A-Za-z0-9_-]{2,64})$/;

export function normalizeSha(input, fallback = "") {
  const sha = String(input ?? "")
    .trim()
    .toLowerCase();
  const resolved = sha || String(fallback ?? "").trim().toLowerCase();
  if (!SHA.test(resolved)) throw new Error("Podaj pełny SHA (40 znaków hex) albo czubek main.");
  return resolved;
}

export function requireMain(ref) {
  if (ref !== "refs/heads/main") throw new Error("Promote admin odpalaj z gałęzi main.");
}

export function requireAncestor(isAncestor) {
  if (isAncestor !== true && isAncestor !== "true") throw new Error("SHA nie jest na main w rewizji workflow.");
}

export function canSkipDevIdentity(overrideReason) {
  return String(overrideReason ?? "").trim().length >= 8;
}

export function assertProjectId(projectId) {
  if (!PROJECT_ID.test(String(projectId ?? ""))) throw new Error("Niepoprawny VERCEL_PROJECT_ID.");
  return projectId;
}

export function assertTeamId(teamId) {
  if (!teamId) return "";
  if (!TEAM_ID.test(teamId)) throw new Error("Niepoprawny VERCEL_TEAM_ID.");
  return teamId;
}

export function normalizeDeploymentId(value) {
  const raw = String(value ?? "").trim();
  if (DEPLOYMENT_ID.test(raw)) return raw;
  if (/^[A-Za-z0-9]{8,80}$/.test(raw)) return `dpl_${raw}`;
  throw new Error("Niepoprawny identyfikator deploymentu Vercel.");
}

export function readIdentity(headers) {
  const get = typeof headers?.get === "function" ? (key) => headers.get(key) : (key) => headers?.[key];
  return {
    schema: String(get("x-fiziyo-release-schema") ?? ""),
    sha: String(get("x-fiziyo-admin-sha") ?? ""),
    deploymentId: String(get("x-fiziyo-deployment-id") ?? ""),
    apiOrigin: String(get("x-fiziyo-api-origin") ?? ""),
  };
}

export function assertIdentity(observed, { sha, apiOrigin }) {
  if (observed.schema !== "1" || observed.sha !== sha || observed.apiOrigin !== apiOrigin) {
    throw new Error("Live identity does not match the candidate.");
  }
  return { ...observed, deploymentId: normalizeDeploymentId(observed.deploymentId) };
}

export function selectSourceDeployment(deployments, sha) {
  const ready = (Array.isArray(deployments) ? deployments : []).filter((item) => {
    const state = item.readyState || item.state;
    const commit = item.meta?.githubCommitSha || item.meta?.gitCommitSha || "";
    return state === "READY" && commit.toLowerCase() === sha;
  });
  const production = ready.find((item) => item.target === "production");
  if (production) return { kind: "production", deployment: production };
  const preview = ready.find((item) => item.target !== "production");
  if (preview) return { kind: "preview", deployment: preview };
  return { kind: "missing", deployment: null };
}

export function planPromote({ source, explicitDeployment }) {
  if (explicitDeployment) {
    const sourceId = normalizeDeploymentId(explicitDeployment.id || explicitDeployment.uid);
    if (explicitDeployment.target !== "production") {
      return { action: "rebuild", sourceId, reason: "preview-cannot-alias" };
    }
    return { action: "alias", sourceId };
  }
  if (source?.kind === "production") {
    return { action: "alias", sourceId: normalizeDeploymentId(source.deployment.id || source.deployment.uid) };
  }
  if (source?.kind === "preview") {
    return {
      action: "rebuild",
      sourceId: normalizeDeploymentId(source.deployment.id || source.deployment.uid),
      reason: "preview-cannot-alias",
    };
  }
  return { action: "create-git" };
}

function teamQuery(teamId) {
  const id = assertTeamId(teamId);
  return id ? `teamId=${encodeURIComponent(id)}` : "";
}

function withQuery(path, teamId) {
  const query = teamQuery(teamId);
  return query ? `${path}?${query}` : path;
}

export async function observeSignIn(baseUrl, expected, fetchImpl = fetch) {
  const response = await fetchImpl(`${baseUrl}/sign-in`, {
    method: "HEAD",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`sign-in ${response.status}`);
  return assertIdentity(readIdentity(response.headers), expected);
}

export async function waitForIdentity(baseUrl, expected, { fetchImpl = fetch, attempts = 12, delayMs = 5000, sleep = delay } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await observeSignIn(baseUrl, expected, fetchImpl);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(delayMs);
    }
  }
  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function vercelJson(fetchImpl, token, method, requestPath, body) {
  if (!token || token.length < 20) throw new Error("Brak VERCEL_TOKEN.");
  const response = await fetchImpl(`https://api.vercel.com${requestPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Vercel API ${response.status}`);
  if (response.status === 202) return { accepted: true };
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function deploymentCommit(deployment) {
  return String(deployment?.meta?.githubCommitSha || deployment?.meta?.gitCommitSha || "").toLowerCase();
}

export async function loadExplicitDeployment(fetchImpl, env, deploymentId, sha) {
  const id = normalizeDeploymentId(deploymentId);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", withQuery(`/v13/deployments/${id}`, env.VERCEL_TEAM_ID));
  if (deploymentCommit(payload) !== sha) throw new Error("deployment_id nie należy do podanego SHA.");
  return { ...payload, id: normalizeDeploymentId(payload.id || payload.uid || id) };
}

export async function listShaDeployments(fetchImpl, env, sha) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const query = new URLSearchParams({ projectId, sha, limit: "20" });
  const teamId = assertTeamId(env.VERCEL_TEAM_ID);
  if (teamId) query.set("teamId", teamId);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", `/v6/deployments?${query}`);
  return Array.isArray(payload.deployments) ? payload.deployments : [];
}

export async function executePromote(fetchImpl, env, plan, sha) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const name = env.VERCEL_PROJECT_NAME || PROJECT_NAME;
  if (plan.action === "alias") {
    await vercelJson(
      fetchImpl,
      env.VERCEL_TOKEN,
      "POST",
      withQuery(`/v10/projects/${projectId}/promote/${plan.sourceId}`, env.VERCEL_TEAM_ID),
      {}
    );
    return { deploymentId: plan.sourceId, rebuilt: false };
  }
  const body =
    plan.action === "rebuild"
      ? { name, deploymentId: plan.sourceId, target: "production", meta: { action: "promote" } }
      : {
          name,
          target: "production",
          gitSource: {
            type: "github",
            org: "Prezentytu",
            repo: PROJECT_NAME,
            ref: sha,
            sha,
          },
        };
  const created = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "POST", withQuery("/v13/deployments", env.VERCEL_TEAM_ID), body);
  const deploymentId = normalizeDeploymentId(created.id || created.uid);
  return { deploymentId, rebuilt: true };
}

export async function waitUntilReady(fetchImpl, env, deploymentId, { attempts = 36, delayMs = 5000, sleep = delay } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const payload = await vercelJson(
      fetchImpl,
      env.VERCEL_TOKEN,
      "GET",
      withQuery(`/v13/deployments/${deploymentId}`, env.VERCEL_TEAM_ID)
    );
    const state = payload.readyState || payload.state;
    if (state === "READY") return payload;
    if (state === "ERROR" || state === "CANCELED") throw new Error(`Deployment ${state}`);
    lastError = new Error(`Deployment ${state || "pending"}`);
    if (attempt < attempts - 1) await sleep(delayMs);
  }
  throw lastError;
}

export async function promoteAdmin(env, { fetchImpl = fetch, sleep = delay, now = () => new Date().toISOString() } = {}) {
  requireMain(env.GITHUB_REF);
  const sha = normalizeSha(env.ADMIN_SHA, env.MAIN_SHA);
  requireAncestor(env.IS_ANCESTOR);

  let skippedDev = false;
  if (canSkipDevIdentity(env.OVERRIDE_REASON)) skippedDev = true;
  else await observeSignIn(DEV_APP_URL, { sha, apiOrigin: DEV_API_ORIGIN }, fetchImpl);

  const explicit = env.DEPLOYMENT_ID ? await loadExplicitDeployment(fetchImpl, env, env.DEPLOYMENT_ID, sha) : null;
  const listed = explicit ? [] : await listShaDeployments(fetchImpl, env, sha);
  const plan = planPromote({ source: selectSourceDeployment(listed, sha), explicitDeployment: explicit });
  if (plan.action === "alias" && plan.reason === "preview-cannot-alias") throw new Error("Preview cannot be aliased.");

  const promoted = await executePromote(fetchImpl, env, plan, sha);
  if (promoted.rebuilt) await waitUntilReady(fetchImpl, env, promoted.deploymentId, { sleep });
  const prod = await waitForIdentity(
    PROD_APP_URL,
    { sha, apiOrigin: PROD_API_ORIGIN },
    { fetchImpl, sleep, attempts: 12, delayMs: 5000 }
  );

  const result = {
    schemaVersion: 1,
    action: plan.action,
    sha,
    deploymentId: prod.deploymentId,
    rebuilt: promoted.rebuilt,
    skippedDevIdentity: skippedDev,
    completedAt: now(),
  };
  return result;
}

function writeEvidence(result) {
  fs.writeFileSync(path.resolve("promote-admin-result.json"), `${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await promoteAdmin(process.env);
    writeEvidence(result);
    console.log(`Promote admin ${result.action} ${result.sha} ${result.deploymentId}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Promote admin failed.");
    process.exitCode = 1;
  }
}
