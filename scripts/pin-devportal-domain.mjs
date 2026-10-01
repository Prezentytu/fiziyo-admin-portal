import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  DEV_API_ORIGIN,
  DEV_APP_URL,
  PROJECT_NAME,
  applyTeamScope,
  assertProjectId,
  formatVercelApiError,
  readIdentity,
  teamScopeQuery,
  normalizeDeploymentId,
  normalizeSha,
} from "./promote-admin.mjs";

export const DEV_DOMAINS = ["devportal.fiziyo.pl", "dev.portal.fiziyo.pl"];
export const TRUNK_BRANCH = "main";
export const LEGACY_INTEGRATION_BRANCH = "dev";
export const VERCEL_PRODUCTION_BRANCH = "production";

export function isDevDomain(name) {
  return DEV_DOMAINS.includes(String(name ?? ""));
}

export function assertTrunkIsNotProductionBranch(project) {
  const productionBranch = String(project?.link?.productionBranch ?? "");
  if (!productionBranch || productionBranch === TRUNK_BRANCH) {
    throw new Error(
      `Vercel Production Branch = "${productionBranch || "?"}". Każdy merge do main idzie wtedy na PROD, ` +
        `a domena DEV bez gitBranch staje się domeną produkcji. Ustaw Settings → Environments → Production → ` +
        `Branch Tracking na "${VERCEL_PRODUCTION_BRANCH}".`
    );
  }
  return productionBranch;
}

// Vercel treats a domain without gitBranch as a Production domain, so DEV must stay bound to the trunk.
export function planDevDomainAssignment(domain) {
  const name = String(domain?.name ?? "");
  if (!isDevDomain(name)) throw new Error("Not a DEV domain.");
  const previous = domain.gitBranch || null;
  if (previous === TRUNK_BRANCH) {
    return { action: "keep", gitBranch: TRUNK_BRANCH, previous };
  }
  return { action: "assign", gitBranch: TRUNK_BRANCH, previous };
}

export function shouldSkipAlias({ ref, environment } = {}) {
  if (environment === "Production") return "production";
  if (ref === LEGACY_INTEGRATION_BRANCH) return "legacy-dev-branch";
  return "";
}

export function assertPreviewDeployment(deployment) {
  if (!deployment) throw new Error("Brak deploymentu Preview dla DEV.");
  if (deployment.target === "production") {
    throw new Error("DEV domain cannot follow a production deployment.");
  }
  return deployment;
}

export function selectMainPreviewDeployment(deployments, sha) {
  const expected = normalizeSha(sha);
  const ready = (Array.isArray(deployments) ? deployments : []).filter((item) => {
    const state = item.readyState || item.state;
    const commit = String(item.meta?.githubCommitSha || item.meta?.gitCommitSha || "").toLowerCase();
    const ref = item.meta?.githubCommitRef || item.meta?.gitBranch;
    const onTrunk = !ref || ref === TRUNK_BRANCH;
    return state === "READY" && commit === expected && onTrunk && item.target !== "production";
  });
  return ready[0] || null;
}

export function assertDevIdentity(observed, { sha } = {}) {
  if (observed.schema !== "1" || observed.apiOrigin !== DEV_API_ORIGIN) {
    throw new Error(`DEV serwuje API "${observed.apiOrigin || "?"}" zamiast ${DEV_API_ORIGIN}.`);
  }
  if (sha && observed.sha !== sha) {
    throw new Error(`DEV serwuje SHA ${observed.sha || "?"} zamiast ${sha}.`);
  }
  return { ...observed, deploymentId: normalizeDeploymentId(observed.deploymentId) };
}

function withQuery(requestPath, teamId) {
  const query = teamScopeQuery(teamId);
  return query ? `${requestPath}?${query}` : requestPath;
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
  if (!response.ok) throw new Error(formatVercelApiError(response.status, await response.text()));
  if (response.status === 202) return { accepted: true };
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function getProject(fetchImpl, env) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  return vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", withQuery(`/v9/projects/${projectId}`, env.VERCEL_TEAM_ID));
}

export async function listProjectDomains(fetchImpl, env) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", withQuery(`/v9/projects/${projectId}/domains`, env.VERCEL_TEAM_ID));
  return Array.isArray(payload.domains) ? payload.domains : [];
}

export async function assignDomainToTrunk(fetchImpl, env, domainName) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const encoded = encodeURIComponent(domainName);
  return vercelJson(fetchImpl, env.VERCEL_TOKEN, "PATCH", withQuery(`/v9/projects/${projectId}/domains/${encoded}`, env.VERCEL_TEAM_ID), {
    gitBranch: TRUNK_BRANCH,
  });
}

export async function aliasDevDomain(fetchImpl, env, deploymentId) {
  const id = normalizeDeploymentId(deploymentId);
  return vercelJson(fetchImpl, env.VERCEL_TOKEN, "POST", withQuery("/v2/aliases", env.VERCEL_TEAM_ID), {
    alias: new URL(DEV_APP_URL).host,
    deploymentId: id,
  });
}

export async function listShaDeployments(fetchImpl, env, sha) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const query = new URLSearchParams({ projectId, sha, limit: "20" });
  applyTeamScope(query, env.VERCEL_TEAM_ID);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", `/v6/deployments?${query}`);
  return Array.isArray(payload.deployments) ? payload.deployments : [];
}

export async function waitForDevIdentity(expected, { fetchImpl = fetch, attempts = 12, delayMs = 5000, sleep = delay } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${DEV_APP_URL}/sign-in`, {
        method: "HEAD",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`sign-in ${response.status}`);
      return assertDevIdentity(readIdentity(response.headers), expected);
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

export async function pinDevportalDomain(env, { fetchImpl = fetch, sleep = delay } = {}) {
  const productionBranch = assertTrunkIsNotProductionBranch(await getProject(fetchImpl, env));

  const domains = (await listProjectDomains(fetchImpl, env)).filter((item) => isDevDomain(item.name));
  if (!domains.length) throw new Error("Brak domeny DEV w projekcie Vercel.");

  const reassigned = [];
  for (const domain of domains) {
    const plan = planDevDomainAssignment(domain);
    if (plan.action === "assign") {
      await assignDomainToTrunk(fetchImpl, env, domain.name);
      reassigned.push({ name: domain.name, from: plan.previous, to: plan.gitBranch });
    }
  }

  const environment = env.DEPLOYMENT_ENV;
  let skipped = shouldSkipAlias({ ref: env.DEPLOYMENT_REF, environment });
  let sha = !skipped && env.DEPLOYMENT_SHA ? normalizeSha(env.DEPLOYMENT_SHA) : "";
  let deploymentId = null;
  if (sha) {
    const preview = selectMainPreviewDeployment(await listShaDeployments(fetchImpl, env), sha);
    if (!preview && environment === "Preview") {
      skipped = "feature-preview";
      sha = "";
    } else {
      deploymentId = normalizeDeploymentId(assertPreviewDeployment(preview).id || preview.uid);
      await aliasDevDomain(fetchImpl, env, deploymentId);
    }
  }

  const live = await waitForDevIdentity({ sha }, { fetchImpl, sleep });
  return {
    skipped,
    productionBranch,
    reassigned,
    aliased: Boolean(deploymentId),
    deploymentId: deploymentId ?? live.deploymentId,
    project: env.VERCEL_PROJECT_NAME || PROJECT_NAME,
    apiOrigin: live.apiOrigin,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await pinDevportalDomain(process.env);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Pin DEV domain failed.");
    process.exitCode = 1;
  }
}
